import { createReadStream, existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

import { createClient } from '@supabase/supabase-js';

const HOST = process.env.INSTANCE_WRAPPER_HOST || '127.0.0.1';
const PORT = Number(process.env.INSTANCE_WRAPPER_PORT || 3000);
const DIST_DIR = resolve(process.cwd(), 'dist');
const INDEX_HTML_PATH = join(DIST_DIR, 'index.html');

const OC_GATEWAY_BASE_URL = (process.env.OC_GATEWAY_BASE_URL || 'http://127.0.0.1:19001').replace(/\/$/, '');
const OC_GATEWAY_TOKEN = process.env.OC_GATEWAY_TOKEN || process.env.SAGE_OC_GATEWAY_TOKEN || 'sage-dev-gateway-token';
const OC_AGENT_ID = process.env.OC_CHAT_AGENT_ID || process.env.OC_HOOK_AGENT_ID || 'main';
const CHAT_MODEL = process.env.OC_CHAT_MODEL || `openclaw:${OC_AGENT_ID}`;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ocaybxaeoqrryyynznhp.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_uqyYIudFYpZp9VN8Gy2dpw_lhxBwOPu';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const PRIMARY_DOMAIN_SUFFIX = process.env.SAGE_PRIMARY_DOMAIN_SUFFIX || 'joinsage.app';

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

const authClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
const serviceRoleClient = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

type ChatRequestBody = {
  message?: string;
  conversationId?: string;
  communicationType?: 'chat' | 'text' | 'email';
};

type InstanceAccessPayload = {
  instanceId: string;
  ipAddress?: string;
  ownerUserId: string;
  primaryDomain: string | null;
  slug: string;
};

type AuthenticatedRequest = {
  token: string;
  user: {
    id: string;
  };
};

type LoginEligibilityRequest = {
  phone?: string;
};

const sendJson = (res: ServerResponse, statusCode: number, payload: unknown) => {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
};

const getBearerToken = (req: IncomingMessage) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return null;
  }

  return header.slice('Bearer '.length).trim() || null;
};

const getRequestHost = (req: IncomingMessage) => {
  const forwardedHost = req.headers['x-forwarded-host'];
  const hostHeader = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost || req.headers.host || '';
  return hostHeader.replace(/:\d+$/, '').trim().toLowerCase();
};

const buildUserScopedClient = (token: string) =>
  createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

const normalizePhone = (phone: string) => {
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
};

const requireAuthenticatedUser = async (req: IncomingMessage, res: ServerResponse): Promise<AuthenticatedRequest | null> => {
  const token = getBearerToken(req);

  if (!token) {
    sendJson(res, 401, { error: 'Unauthorized' });
    return null;
  }

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(token);

  if (error || !user) {
    sendJson(res, 401, { error: 'Unauthorized' });
    return null;
  }

  return {
    token,
    user: {
      id: user.id,
    },
  };
};

const resolveInstanceAccess = async (req: IncomingMessage, auth: AuthenticatedRequest) => {
  const host = getRequestHost(req);
  const client = buildUserScopedClient(auth.token);
  const slugMatch = host.endsWith(`.${PRIMARY_DOMAIN_SUFFIX}`)
    ? host.slice(0, -(PRIMARY_DOMAIN_SUFFIX.length + 1))
    : null;

  const filters = [
    `ip_address.eq.${host}`,
    `primary_domain.eq.${host}`,
  ];

  if (slugMatch) {
    filters.push(`slug.eq.${slugMatch}`);
  }

  const { data, error } = await client
    .from('instances')
    .select('id, owner_user_id, slug, primary_domain, ip_address, deleted_at')
    .is('deleted_at', null)
    .or(filters.join(','))
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to verify instance ownership: ${error.message}`);
  }

  if (!data || data.owner_user_id !== auth.user.id) {
    return null;
  }

  return {
    instanceId: data.id,
    ipAddress: data.ip_address || undefined,
    ownerUserId: data.owner_user_id,
    primaryDomain: data.primary_domain,
    slug: data.slug,
  } satisfies InstanceAccessPayload;
};

const resolveInstanceAccessForServer = async (req: IncomingMessage) => {
  if (!serviceRoleClient) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for instance ownership checks.');
  }

  const host = getRequestHost(req);
  const slugMatch = host.endsWith(`.${PRIMARY_DOMAIN_SUFFIX}`)
    ? host.slice(0, -(PRIMARY_DOMAIN_SUFFIX.length + 1))
    : null;
  const filters = [`ip_address.eq.${host}`, `primary_domain.eq.${host}`];

  if (slugMatch) {
    filters.push(`slug.eq.${slugMatch}`);
  }

  const { data, error } = await serviceRoleClient
    .from('instances')
    .select('id, owner_user_id, slug, primary_domain, ip_address, deleted_at')
    .is('deleted_at', null)
    .or(filters.join(','))
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve instance for host: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    instanceId: data.id,
    ipAddress: data.ip_address || undefined,
    ownerUserId: data.owner_user_id,
    primaryDomain: data.primary_domain,
    slug: data.slug,
  } satisfies InstanceAccessPayload;
};

const isPhoneAllowedForInstance = async (req: IncomingMessage, phone: string) => {
  if (!serviceRoleClient) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for login phone checks.');
  }

  const instance = await resolveInstanceAccessForServer(req);
  if (!instance) {
    return { allowed: false, reason: 'This Sage instance could not be resolved.' };
  }

  const { data: profile, error } = await serviceRoleClient
    .from('profiles')
    .select('phone_number')
    .eq('id', instance.ownerUserId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load instance owner profile: ${error.message}`);
  }

  const ownerPhone = normalizePhone(profile?.phone_number || '');
  if (!ownerPhone) {
    return {
      allowed: false,
      reason: 'This Sage instance does not have an owner phone number configured yet.',
    };
  }

  if (normalizePhone(phone) !== ownerPhone) {
    return {
      allowed: false,
      reason: 'This phone number is not authorized for this Sage computer.',
    };
  }

  return { allowed: true, instance };
};

const readJsonBody = async <T>(req: IncomingMessage): Promise<T> => {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const body = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(body) as T;
};

const streamOpenClawChat = async (res: ServerResponse, body: ChatRequestBody) => {
  const message = body.message?.trim();
  if (!message) {
    sendJson(res, 400, { error: 'message is required' });
    return;
  }

  const upstreamResponse = await fetch(`${OC_GATEWAY_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${OC_GATEWAY_TOKEN}`,
      'content-type': 'application/json',
      'x-openclaw-agent-id': OC_AGENT_ID,
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      stream: true,
      user: body.conversationId,
      messages: [{ role: 'user', content: message }],
    }),
  });

  if (!upstreamResponse.ok) {
    const contentType = upstreamResponse.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await upstreamResponse.json()
      : { error: await upstreamResponse.text() };

    sendJson(res, upstreamResponse.status, payload);
    return;
  }

  if (!upstreamResponse.body) {
    sendJson(res, 502, { error: 'OpenClaw returned no response body.' });
    return;
  }

  res.statusCode = 200;
  res.setHeader('content-type', 'text/event-stream; charset=utf-8');
  res.setHeader('cache-control', 'no-cache, no-transform');
  res.setHeader('connection', 'keep-alive');

  const reader = upstreamResponse.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      res.write(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
    res.end();
  }
};

const serveStaticFile = async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || `${HOST}:${PORT}`}`);
  const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname;
  const safePath = normalize(requestedPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(DIST_DIR, safePath);

  if (existsSync(filePath)) {
    const fileStats = await stat(filePath);
    if (fileStats.isFile()) {
      res.statusCode = 200;
      res.setHeader('content-type', MIME_TYPES[extname(filePath)] || 'application/octet-stream');
      createReadStream(filePath).pipe(res);
      return;
    }
  }

  if (!existsSync(INDEX_HTML_PATH)) {
    sendJson(res, 500, { error: 'dist/index.html not found. Run `pnpm --filter @sage/instance-wrapper build` first.' });
    return;
  }

  res.statusCode = 200;
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(await readFile(INDEX_HTML_PATH, 'utf8'));
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || `${HOST}:${PORT}`}`);

    if (req.method === 'GET' && url.pathname === '/api/health') {
      sendJson(res, 200, {
        ok: true,
        mode: 'openclaw-chat-proxy',
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/instance-access') {
      const auth = await requireAuthenticatedUser(req, res);
      if (!auth) {
        return;
      }

      const access = await resolveInstanceAccess(req, auth);
      if (!access) {
        sendJson(res, 403, { error: 'This Sage instance does not belong to your account.' });
        return;
      }

      sendJson(res, 200, access);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/login/eligibility') {
      const body = await readJsonBody<LoginEligibilityRequest>(req);
      const phone = body.phone?.trim() || '';

      if (!phone.startsWith('+')) {
        sendJson(res, 400, { error: 'phone is required in E.164 format.' });
        return;
      }

      const eligibility = await isPhoneAllowedForInstance(req, phone);
      if (!eligibility.allowed) {
        sendJson(res, 403, { allowed: false, error: eligibility.reason });
        return;
      }

      sendJson(res, 200, { allowed: true });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/chat') {
      const auth = await requireAuthenticatedUser(req, res);
      if (!auth) {
        return;
      }

      const access = await resolveInstanceAccess(req, auth);
      if (!access) {
        sendJson(res, 403, { error: 'This Sage instance does not belong to your account.' });
        return;
      }

      const body = await readJsonBody<ChatRequestBody>(req);
      body.conversationId = body.conversationId || `${access.instanceId}:${auth.user.id}`;
      await streamOpenClawChat(res, body);
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }

    await serveStaticFile(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    sendJson(res, 500, { error: message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`instance-wrapper listening on http://${HOST}:${PORT}`);
  console.log(`proxying chat to ${OC_GATEWAY_BASE_URL}/v1/chat/completions (${CHAT_MODEL})`);
});
