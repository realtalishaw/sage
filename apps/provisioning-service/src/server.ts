import { execFile, spawn } from 'node:child_process';
import { access, cp, mkdir, mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import {
  isCreateInstanceRequest,
  type CreateInstanceRequest,
  type CreatedInstanceResponse,
  type DeletedInstanceResponse,
  type InstanceListResponse,
  type InstanceProvisioningStatus,
  type InstanceStatusResponse,
  type ProvisioningHealthResponse,
} from '@sage/instance-contracts';
import { createClient } from '@supabase/supabase-js';

const execFileAsync = promisify(execFile);

const REPO_ROOT = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const HOST = process.env.PROVISIONING_SERVICE_HOST || '127.0.0.1';
const PORT = Number(process.env.PROVISIONING_SERVICE_PORT || 4010);
const DEFAULT_REGION = process.env.SAGE_DO_REGION || 'nyc1';
const DEFAULT_SIZE = process.env.SAGE_DO_SIZE || 's-4vcpu-8gb';
const DEFAULT_IMAGE = process.env.SAGE_DO_IMAGE || 'ubuntu-24-04-x64';
const DEFAULT_SSH_KEY_REFS = (process.env.SAGE_DO_SSH_KEY_REFS || 'sage-manual-deploy')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const DEFAULT_TAGS = (process.env.SAGE_DO_TAGS || 'sage-instance')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const API_BASE_URL = process.env.PROVISIONING_SERVICE_PUBLIC_URL || `http://${HOST}:${PORT}`;
const SECRET_ENV_PATH = process.env.SAGE_PROVISIONING_SECRET_ENV_PATH || join(REPO_ROOT, '.secrets/.env');
const SECRET_ENV_CONTENT = process.env.SAGE_PROVISIONING_SECRET_ENV_CONTENT;
const SECRET_ENV_CONTENT_B64 = process.env.SAGE_PROVISIONING_SECRET_ENV_CONTENT_B64;
const WRAPPER_ENV_PATH = process.env.SAGE_INSTANCE_WRAPPER_ENV_PATH || join(REPO_ROOT, 'apps/instance-wrapper/.env');
const DEPLOY_WAIT_TIMEOUT_MS = Number(process.env.SAGE_DEPLOY_WAIT_TIMEOUT_MS || 20 * 60 * 1000);
const BUNDLE_TTL_MS = Number(process.env.SAGE_PROVISIONING_BUNDLE_TTL_MS || 30 * 60 * 1000);
const OPENCLAW_ARCHIVE_URL =
  process.env.SAGE_OPENCLAW_ARCHIVE_URL || 'https://codeload.github.com/realtalishaw/openclaw/tar.gz/refs/heads/main';
const PRIMARY_DOMAIN_SUFFIX = process.env.SAGE_PRIMARY_DOMAIN_SUFFIX || 'joinsage.app';
const SAGE_ROOT = '/opt/sage';
const REMOTE_ENV_FILE = '/etc/sage/openclaw.env';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.SAGE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SAGE_SUPABASE_SERVICE_ROLE_KEY;

type SshKeyRecord = {
  id: number;
  name: string;
  fingerprint: string;
};

type DropletRecord = {
  id: number;
  name: string;
  image?: {
    slug?: string;
  };
  region?: {
    slug?: string;
  };
  size?: {
    slug?: string;
  };
  size_slug?: string;
  status?: string;
  networks?: {
    v4?: Array<{
      ip_address?: string;
      type?: string;
    }>;
  };
  public_ipv4?: string;
};

type BundleRecord = {
  createdAt: number;
  filePath: string;
};

type InstanceRow = {
  created_at: string;
  deleted_at: string | null;
  droplet_id: string | null;
  droplet_name: string | null;
  id: string;
  image: string | null;
  ip_address: string | null;
  owner_user_id: string;
  primary_domain: string | null;
  ready_at: string | null;
  region: string | null;
  size: string | null;
  slug: string;
  status: InstanceProvisioningStatus | string;
  updated_at: string;
};

type InstanceJobRow = {
  completed_at: string | null;
  created_at: string;
  error_message: string | null;
  id: string;
  instance_id: string;
  owner_user_id: string;
  status: InstanceProvisioningStatus | string;
  step: string | null;
  updated_at: string;
};

type CommandOptions = {
  cwd?: string;
  input?: string;
  timeoutMs?: number;
};

const bundleStore = new Map<string, BundleRecord>();
const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

const sendJson = (res: ServerResponse, statusCode: number, payload: unknown) => {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
};

const readJsonBody = async <T>(req: IncomingMessage): Promise<T> => {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const body = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(body) as T;
};

const getSupabaseAdmin = () => {
  if (!supabaseAdmin) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured for provisioning.');
  }

  return supabaseAdmin;
};

const getSecretEnvContent = async () => {
  if (SECRET_ENV_CONTENT_B64 && SECRET_ENV_CONTENT_B64.trim().length > 0) {
    return Buffer.from(SECRET_ENV_CONTENT_B64, 'base64').toString('utf8').trim();
  }

  if (SECRET_ENV_CONTENT && SECRET_ENV_CONTENT.trim().length > 0) {
    return SECRET_ENV_CONTENT.trim();
  }

  await access(SECRET_ENV_PATH);
  return (await readFile(SECRET_ENV_PATH, 'utf8')).trim();
};

const parseEnvLines = (envText: string) => {
  const envMap = new Map<string, string>();

  for (const rawLine of envText.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    envMap.set(key, value);
  }

  return envMap;
};

const serializeEnvMap = (envMap: Map<string, string>) =>
  [...envMap.entries()].map(([key, value]) => `${key}=${value}`).join('\n');

const getWrapperBuildEnv = async () => {
  const envMap = new Map<string, string>();

  const applyIfPresent = (key: string, value?: string | null) => {
    if (value && value.trim().length > 0) {
      envMap.set(key, value.trim());
    }
  };

  applyIfPresent('VITE_SUPABASE_URL', process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
  applyIfPresent(
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY,
  );
  applyIfPresent('VITE_SUPABASE_PROJECT_ID', process.env.VITE_SUPABASE_PROJECT_ID);

  if (envMap.has('VITE_SUPABASE_URL') && envMap.has('VITE_SUPABASE_PUBLISHABLE_KEY')) {
    return envMap;
  }

  try {
    const wrapperEnvText = await readFile(WRAPPER_ENV_PATH, 'utf8');
    const wrapperEnv = parseEnvLines(wrapperEnvText);
    for (const key of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_PROJECT_ID']) {
      const value = wrapperEnv.get(key);
      if (value && !envMap.has(key)) {
        envMap.set(key, value);
      }
    }
  } catch {
    // ignore missing local wrapper env file and fail validation below
  }

  if (!envMap.has('VITE_SUPABASE_URL') || !envMap.has('VITE_SUPABASE_PUBLISHABLE_KEY')) {
    throw new Error(
      'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be available for droplet wrapper builds.',
    );
  }

  return envMap;
};

const runProcess = async (command: string, args: string[], options: CommandOptions = {}) => {
  const { cwd, input, timeoutMs } = options;

  return await new Promise<{ stdout: string; stderr: string }>((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    const timeout =
      timeoutMs !== undefined
        ? setTimeout(() => {
            child.kill('SIGTERM');
            rejectPromise(new Error(`${command} timed out after ${timeoutMs}ms.`));
          }, timeoutMs)
        : undefined;

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      rejectPromise(error);
    });

    child.on('close', (code) => {
      if (timeout) {
        clearTimeout(timeout);
      }

      if (code === 0) {
        resolvePromise({ stdout, stderr });
        return;
      }

      rejectPromise(new Error(`${command} ${args.join(' ')} failed with exit code ${code}: ${stderr || stdout}`));
    });

    if (input !== undefined) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
};

const runDoctl = async (args: string[]) => {
  const { stdout } = await execFileAsync('doctl', args, {
    maxBuffer: 10 * 1024 * 1024,
  });

  return stdout.trim();
};

const listSshKeys = async (): Promise<SshKeyRecord[]> => {
  const output = await runDoctl(['compute', 'ssh-key', 'list', '--output', 'json']);
  return JSON.parse(output) as SshKeyRecord[];
};

const resolveSshKeyIds = async (refs: string[]): Promise<string[]> => {
  const keys = await listSshKeys();
  const resolvedIds = refs.map((ref) => {
    const normalizedRef = ref.trim();
    const matchedKey = keys.find(
      (key) => String(key.id) === normalizedRef || key.name === normalizedRef || key.fingerprint === normalizedRef,
    );

    if (!matchedKey) {
      throw new Error(`Unable to resolve DigitalOcean SSH key reference "${normalizedRef}".`);
    }

    return String(matchedKey.id);
  });

  return [...new Set(resolvedIds)];
};

const cleanupExpiredBundles = async () => {
  const now = Date.now();
  const staleEntries = [...bundleStore.entries()].filter(([, record]) => now - record.createdAt > BUNDLE_TTL_MS);

  await Promise.all(
    staleEntries.map(async ([bundleId, record]) => {
      bundleStore.delete(bundleId);
      await rm(join(record.filePath, '..'), { force: true, recursive: true }).catch(() => {});
    }),
  );
};

const createProvisioningBundle = async () => {
  await cleanupExpiredBundles();

  const bundleId = randomUUID();
  const tempDirPath = await mkdtemp(join(tmpdir(), 'sage-provisioning-bundle-'));
  const payloadRoot = join(tempDirPath, 'payload');
  const bundlePath = join(tempDirPath, 'payload.tar.gz');
  const openClawArchivePath = join(tempDirPath, 'openclaw.tar.gz');

  await mkdir(join(payloadRoot, 'apps'), { recursive: true });
  await mkdir(join(payloadRoot, 'forks', 'openclaw'), { recursive: true });
  await mkdir(join(payloadRoot, 'scripts'), { recursive: true });
  await mkdir(join(payloadRoot, 'infrastructure'), { recursive: true });

  await cp(join(REPO_ROOT, 'apps/instance-wrapper'), join(payloadRoot, 'apps/instance-wrapper'), {
    recursive: true,
  });
  await cp(join(REPO_ROOT, 'scripts/bootstrap'), join(payloadRoot, 'scripts/bootstrap'), {
    recursive: true,
  });
  await cp(join(REPO_ROOT, 'infrastructure/bootstrap'), join(payloadRoot, 'infrastructure/bootstrap'), {
    recursive: true,
  });

  await runProcess('curl', ['-fsSL', OPENCLAW_ARCHIVE_URL, '-o', openClawArchivePath], {
    timeoutMs: 5 * 60 * 1000,
  });
  await runProcess(
    'tar',
    ['-xzf', openClawArchivePath, '-C', join(payloadRoot, 'forks', 'openclaw'), '--strip-components=1'],
    { timeoutMs: 5 * 60 * 1000 },
  );

  await runProcess(
    'tar',
    [
      '--exclude=forks/openclaw/.git',
      '--exclude=**/node_modules',
      '-czf',
      bundlePath,
      '-C',
      payloadRoot,
      'apps/instance-wrapper',
      'forks/openclaw',
      'scripts/bootstrap',
      'infrastructure/bootstrap',
    ],
    { timeoutMs: 10 * 60 * 1000 },
  );

  bundleStore.set(bundleId, {
    createdAt: Date.now(),
    filePath: bundlePath,
  });

  return bundleId;
};

const deleteProvisioningBundle = async (bundleId: string) => {
  const record = bundleStore.get(bundleId);

  if (!record) {
    return;
  }

  bundleStore.delete(bundleId);
  await rm(join(record.filePath, '..'), { force: true, recursive: true }).catch(() => {});
};

const buildProvisioningEnvContent = async () => {
  const baseEnv = parseEnvLines(await getSecretEnvContent());
  const wrapperEnv = await getWrapperBuildEnv();
  const gatewayToken = randomUUID();
  const hookToken = randomUUID();

  for (const [key, value] of wrapperEnv.entries()) {
    if (!baseEnv.has(key)) {
      baseEnv.set(key, value);
    }
  }

  baseEnv.set('SAGE_OC_GATEWAY_TOKEN', gatewayToken);
  baseEnv.set('SAGE_OC_HOOK_TOKEN', hookToken);
  baseEnv.set('OC_CHAT_AGENT_ID', 'main');

  return `${serializeEnvMap(baseEnv)}\n`;
};

const buildBootstrapUserData = (params: { bundleUrl: string; envContent: string }) => {
  const envContentB64 = Buffer.from(params.envContent, 'utf8').toString('base64');

  return `#!/usr/bin/env bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

mkdir -p /var/log
exec > >(tee -a /var/log/sage-provisioning.log) 2>&1

retry() {
  local attempts="$1"
  shift
  local n=1
  until "$@"; do
    if [ "$n" -ge "$attempts" ]; then
      return 1
    fi
    n=$((n + 1))
    sleep 5
  done
}

retry 20 apt-get update
retry 20 apt-get install -y ca-certificates curl git build-essential nginx

if ! command -v node >/dev/null 2>&1; then
  retry 20 bash -lc 'curl -fsSL https://deb.nodesource.com/setup_22.x | bash -'
  retry 20 apt-get install -y nodejs
fi

corepack enable

mkdir -p ${SAGE_ROOT} /etc/sage
curl -fsSL ${JSON.stringify(params.bundleUrl)} -o /tmp/sage-payload.tar.gz
tar -xzf /tmp/sage-payload.tar.gz -C ${SAGE_ROOT}
printf '%s' ${JSON.stringify(envContentB64)} | base64 -d > ${REMOTE_ENV_FILE}
chmod 600 ${REMOTE_ENV_FILE}
SAGE_ROOT=${SAGE_ROOT} SAGE_ENV_FILE=${REMOTE_ENV_FILE} bash ${SAGE_ROOT}/scripts/bootstrap/bootstrap-instance-droplet.sh
`;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

const generateSlug = (request: CreateInstanceRequest) => {
  const base = slugify(request.requestedSlug || request.name) || `sage-${Date.now()}`;
  const suffix = randomUUID().slice(0, 6);
  return `${base}-${suffix}`.slice(0, 63);
};

const buildPrimaryDomain = (slug: string) => (PRIMARY_DOMAIN_SUFFIX ? `${slug}.${PRIMARY_DOMAIN_SUFFIX}` : null);

const mapInstanceRowToStatus = (instance: InstanceRow, job?: InstanceJobRow | null): InstanceStatusResponse => ({
  image: instance.image || undefined,
  instanceId: instance.id,
  dropletId: instance.droplet_id || undefined,
  ipAddress: instance.ip_address || undefined,
  name: instance.droplet_name || `${instance.slug}-instance`,
  ownerUserId: instance.owner_user_id,
  primaryDomain: instance.primary_domain,
  region: instance.region || undefined,
  size: instance.size || undefined,
  slug: instance.slug,
  status: (job?.status || instance.status) as InstanceProvisioningStatus,
  step: job?.step || undefined,
  readyAt: instance.ready_at,
  deletedAt: instance.deleted_at,
  error: job?.error_message || undefined,
});

const findInstance = async (instanceRef: string) => {
  const supabase = getSupabaseAdmin();
  const normalizedRef = instanceRef.trim();
  const { data, error } = await supabase
    .from('instances')
    .select('*')
    .or(
      [
        `id.eq.${normalizedRef}`,
        `droplet_id.eq.${normalizedRef}`,
        `droplet_name.eq.${normalizedRef}`,
        `slug.eq.${normalizedRef}`,
        `ip_address.eq.${normalizedRef}`,
        `primary_domain.eq.${normalizedRef}`,
      ].join(','),
    )
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load instance metadata: ${error.message}`);
  }

  return data as InstanceRow | null;
};

const findLatestJob = async (instanceId: string) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('instance_jobs')
    .select('*')
    .eq('instance_id', instanceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load instance job metadata: ${error.message}`);
  }

  return data as InstanceJobRow | null;
};

const updateInstance = async (instanceId: string, patch: Record<string, unknown>) => {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('instances')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', instanceId);

  if (error) {
    throw new Error(`Failed to update instance metadata: ${error.message}`);
  }
};

const createJob = async (instance: InstanceRow) => {
  const supabase = getSupabaseAdmin();
  const payload = {
    instance_id: instance.id,
    owner_user_id: instance.owner_user_id,
    status: 'queued',
    step: 'creating_droplet',
  };
  const { data, error } = await supabase.from('instance_jobs').insert(payload).select('*').single();

  if (error) {
    throw new Error(`Failed to create instance job metadata: ${error.message}`);
  }

  return data as InstanceJobRow;
};

const updateJob = async (jobId: string, patch: Record<string, unknown>) => {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('instance_jobs')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) {
    throw new Error(`Failed to update instance job metadata: ${error.message}`);
  }
};

const createInstanceMetadata = async (request: CreateInstanceRequest) => {
  const supabase = getSupabaseAdmin();
  const slug = generateSlug(request);
  const primaryDomain = buildPrimaryDomain(slug);
  const dropletName = request.name.trim();
  const region = request.region?.trim() || DEFAULT_REGION;

  const payload = {
    owner_user_id: request.ownerUserId.trim(),
    droplet_name: dropletName,
    slug,
    primary_domain: primaryDomain,
    region,
    size: DEFAULT_SIZE,
    image: DEFAULT_IMAGE,
    status: 'queued',
  };

  const { data, error } = await supabase.from('instances').insert(payload).select('*').single();

  if (error) {
    throw new Error(`Failed to create instance metadata: ${error.message}`);
  }

  return data as InstanceRow;
};

const createDroplet = async (
  request: CreateInstanceRequest,
  userData: string,
): Promise<{ createdAt: string; dropletId: string; ipAddress: string; name: string; region: string; size: string; image: string }> => {
  const name = request.name.trim();
  const region = request.region?.trim() || DEFAULT_REGION;
  const size = DEFAULT_SIZE;
  const image = DEFAULT_IMAGE;
  const sshKeyIds = await resolveSshKeyIds(DEFAULT_SSH_KEY_REFS);
  const tempUserDataPath = join(tmpdir(), `sage-provisioning-user-data-${Date.now()}.sh`);

  await writeFile(tempUserDataPath, userData, 'utf8');

  try {
    const args = [
      'compute',
      'droplet',
      'create',
      name,
      '--region',
      region,
      '--size',
      size,
      '--image',
      image,
      '--ssh-keys',
      sshKeyIds.join(','),
      '--user-data-file',
      tempUserDataPath,
      '--wait',
      '--output',
      'json',
    ];

    if (DEFAULT_TAGS.length > 0) {
      args.push('--tag-names', DEFAULT_TAGS.join(','));
    }

    const output = await runDoctl(args);
    const [droplet] = JSON.parse(output) as DropletRecord[];
    const ipAddress =
      droplet?.public_ipv4 || droplet?.networks?.v4?.find((network) => network.type === 'public')?.ip_address;

    if (!ipAddress) {
      throw new Error('DigitalOcean did not return a public IPv4 address.');
    }

    return {
      createdAt: new Date().toISOString(),
      dropletId: String(droplet.id),
      ipAddress,
      name: droplet.name,
      region,
      size,
      image,
    };
  } finally {
    await unlink(tempUserDataPath).catch(() => {});
  }
};

const waitForHttp = async (url: string, timeoutMs: number) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.text();
      }
    } catch {
      // ignore while waiting
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 5_000));
  }

  throw new Error(`Timed out waiting for ${url}.`);
};

const waitForWrapperHealth = async (ipAddress: string) => {
  await waitForHttp(`http://${ipAddress}/api/health`, DEPLOY_WAIT_TIMEOUT_MS);
};

const finalizeProvisioning = async (instance: InstanceRow, job: InstanceJobRow, ipAddress: string, bundleId: string) => {
  try {
    await updateJob(job.id, {
      status: 'provisioning',
      step: 'waiting_for_wrapper',
      error_message: null,
    });
    await waitForWrapperHealth(ipAddress);
    await updateInstance(instance.id, {
      status: 'ready',
      ready_at: new Date().toISOString(),
    });
    await updateJob(job.id, {
      status: 'ready',
      step: 'ready',
      completed_at: new Date().toISOString(),
      error_message: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown provisioning error';
    await updateInstance(instance.id, {
      status: 'error',
    }).catch(() => {});
    await updateJob(job.id, {
      status: 'error',
      step: 'error',
      error_message: message,
      completed_at: new Date().toISOString(),
    }).catch(() => {});
  } finally {
    await deleteProvisioningBundle(bundleId);
  }
};

const provisionInstance = async (request: CreateInstanceRequest, publicBaseUrl: string): Promise<CreatedInstanceResponse> => {
  const instance = await createInstanceMetadata(request);
  const job = await createJob(instance);
  const envContent = await buildProvisioningEnvContent();
  const bundleId = await createProvisioningBundle();

  try {
    const droplet = await createDroplet(
      request,
      buildBootstrapUserData({
        bundleUrl: `${publicBaseUrl}/bundles/${bundleId}`,
        envContent,
      }),
    );

    await updateInstance(instance.id, {
      droplet_id: droplet.dropletId,
      droplet_name: droplet.name,
      ip_address: droplet.ipAddress,
      region: droplet.region,
      size: droplet.size,
      image: droplet.image,
      status: 'provisioning',
    });
    await updateJob(job.id, {
      status: 'provisioning',
      step: 'bootstrapping_droplet',
      error_message: null,
    });

    void finalizeProvisioning(instance, job, droplet.ipAddress, bundleId);

    return {
      createdAt: droplet.createdAt,
      image: droplet.image,
      instanceId: instance.id,
      dropletId: droplet.dropletId,
      ipAddress: droplet.ipAddress,
      name: droplet.name,
      ownerUserId: instance.owner_user_id,
      primaryDomain: instance.primary_domain,
      region: droplet.region,
      size: droplet.size,
      slug: instance.slug,
      status: 'provisioning',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown provisioning error';
    await updateInstance(instance.id, {
      status: 'error',
    }).catch(() => {});
    await updateJob(job.id, {
      status: 'error',
      step: 'error',
      error_message: message,
      completed_at: new Date().toISOString(),
    }).catch(() => {});
    await deleteProvisioningBundle(bundleId);
    throw error;
  }
};

const destroyInstance = async (instanceRef: string): Promise<DeletedInstanceResponse> => {
  const instance = await findInstance(instanceRef);

  if (!instance) {
    throw new Error(`Instance "${instanceRef}" was not found.`);
  }

  if (instance.droplet_id) {
    await runDoctl(['compute', 'droplet', 'delete', '--force', String(instance.droplet_id)]);
  }

  await updateInstance(instance.id, {
    status: 'deleted',
    deleted_at: new Date().toISOString(),
  });

  const latestJob = await findLatestJob(instance.id);
  if (latestJob) {
    await updateJob(latestJob.id, {
      status: 'deleted',
      step: 'deleted',
      completed_at: new Date().toISOString(),
    });
  }

  return {
    deletedAt: new Date().toISOString(),
    instanceId: instance.id,
    dropletId: instance.droplet_id || undefined,
    name: instance.droplet_name || instance.slug,
    ownerUserId: instance.owner_user_id,
    primaryDomain: instance.primary_domain,
    slug: instance.slug,
    status: 'deleted',
  };
};

const getInstanceStatus = async (instanceRef: string): Promise<InstanceStatusResponse | null> => {
  const instance = await findInstance(instanceRef);

  if (!instance) {
    return null;
  }

  const latestJob = await findLatestJob(instance.id);
  return mapInstanceRowToStatus(instance, latestJob);
};

const listInstanceStatuses = async (): Promise<InstanceListResponse> => {
  const supabase = getSupabaseAdmin();
  const { data: instances, error } = await supabase
    .from('instances')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load instance list: ${error.message}`);
  }

  const jobsByInstanceId = new Map<string, InstanceJobRow>();
  const { data: jobs, error: jobsError } = await supabase
    .from('instance_jobs')
    .select('*')
    .order('created_at', { ascending: false });

  if (jobsError) {
    throw new Error(`Failed to load instance jobs: ${jobsError.message}`);
  }

  for (const job of (jobs || []) as InstanceJobRow[]) {
    if (!jobsByInstanceId.has(job.instance_id)) {
      jobsByInstanceId.set(job.instance_id, job);
    }
  }

  return {
    instances: ((instances || []) as InstanceRow[]).map((instance) =>
      mapInstanceRowToStatus(instance, jobsByInstanceId.get(instance.id) || null),
    ),
  };
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || `${HOST}:${PORT}`}`);
    const publicBaseUrl = API_BASE_URL.includes('0.0.0.0')
      ? `${(req.headers['x-forwarded-proto'] as string) || 'http'}://${req.headers.host || `${HOST}:${PORT}`}`
      : API_BASE_URL;

    if (req.method === 'GET' && url.pathname === '/health') {
      const payload: ProvisioningHealthResponse = {
        apiBaseUrl: publicBaseUrl,
        defaultImage: DEFAULT_IMAGE,
        defaultRegion: DEFAULT_REGION,
        defaultSize: DEFAULT_SIZE,
        ok: true,
      };
      sendJson(res, 200, payload);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/instances') {
      const response = await listInstanceStatuses();
      sendJson(res, 200, response);
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/bundles/')) {
      const bundleId = decodeURIComponent(url.pathname.replace('/bundles/', '').trim());
      const record = bundleStore.get(bundleId);

      if (!record) {
        sendJson(res, 404, { error: `Provisioning bundle "${bundleId}" was not found.` });
        return;
      }

      const bundleBuffer = await readFile(record.filePath);
      res.statusCode = 200;
      res.setHeader('content-type', 'application/gzip');
      res.setHeader('content-length', String(bundleBuffer.byteLength));
      res.end(bundleBuffer);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/instances') {
      const body = await readJsonBody<unknown>(req);

      if (!isCreateInstanceRequest(body)) {
        sendJson(res, 400, {
          error: 'Invalid create-instance request body.',
          expected: {
            name: 'string',
            ownerUserId: 'string',
            requestedSlug: 'string?',
            region: 'string?',
          },
        });
        return;
      }

      const response = await provisionInstance(body, publicBaseUrl);
      sendJson(res, 202, response);
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/instances/')) {
      const instanceRef = decodeURIComponent(url.pathname.replace('/instances/', '').trim());

      if (!instanceRef) {
        sendJson(res, 400, { error: 'instanceRef is required in the route path.' });
        return;
      }

      const response = await getInstanceStatus(instanceRef);

      if (!response) {
        sendJson(res, 404, { error: `Instance "${instanceRef}" was not found.` });
        return;
      }

      sendJson(res, 200, response);
      return;
    }

    if (req.method === 'DELETE' && url.pathname.startsWith('/instances/')) {
      const instanceRef = decodeURIComponent(url.pathname.replace('/instances/', '').trim());

      if (!instanceRef) {
        sendJson(res, 400, { error: 'instanceRef is required in the route path.' });
        return;
      }

      const response = await destroyInstance(instanceRef);
      sendJson(res, 200, response);
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown provisioning error';
    sendJson(res, 500, { error: message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`provisioning-service listening on ${API_BASE_URL}`);
});
