import { execFile, spawn } from 'node:child_process';
import { access, chmod, readFile, unlink, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import {
  isCreateInstanceRequest,
  type CreateInstanceRequest,
  type CreatedInstanceResponse,
  type DeletedInstanceResponse,
  type InstanceListResponse,
  type InstanceStatusResponse,
  type ProvisioningHealthResponse,
} from '@sage/instance-contracts';

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
const SSH_USER = process.env.SAGE_DO_SSH_USER || 'root';
const SSH_PRIVATE_KEY = process.env.SAGE_DO_SSH_PRIVATE_KEY;
const SSH_WAIT_TIMEOUT_MS = Number(process.env.SAGE_SSH_WAIT_TIMEOUT_MS || 5 * 60 * 1000);
const DEPLOY_WAIT_TIMEOUT_MS = Number(process.env.SAGE_DEPLOY_WAIT_TIMEOUT_MS || 20 * 60 * 1000);
const SAGE_ROOT = '/opt/sage';
const REMOTE_ENV_FILE = '/etc/sage/openclaw.env';
let sshIdentityPathPromise: Promise<string | null> | null = null;

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

const getSecretEnvContent = async () => {
  if (SECRET_ENV_CONTENT && SECRET_ENV_CONTENT.trim().length > 0) {
    return SECRET_ENV_CONTENT.trim();
  }

  await access(SECRET_ENV_PATH);
  return (await readFile(SECRET_ENV_PATH, 'utf8')).trim();
};

const getSshIdentityPath = async () => {
  if (!SSH_PRIVATE_KEY || SSH_PRIVATE_KEY.trim().length === 0) {
    return null;
  }

  if (!sshIdentityPathPromise) {
    sshIdentityPathPromise = (async () => {
      const tempFilePath = join(tmpdir(), `sage-provisioning-ssh-${Date.now()}.key`);
      await writeFile(tempFilePath, `${SSH_PRIVATE_KEY.trim()}\n`, 'utf8');
      await chmod(tempFilePath, 0o600);
      return tempFilePath;
    })();
  }

  return await sshIdentityPathPromise;
};

type CommandOptions = {
  cwd?: string;
  input?: string;
  timeoutMs?: number;
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

const listDroplets = async (): Promise<DropletRecord[]> => {
  const output = await runDoctl(['compute', 'droplet', 'list', '--output', 'json']);
  return JSON.parse(output) as DropletRecord[];
};

const resolveSshKeyIds = async (refs: string[]): Promise<string[]> => {
  const keys = await listSshKeys();
  const resolvedIds = refs.map((ref) => {
    const normalizedRef = ref.trim();
    const matchedKey = keys.find(
      (key) =>
        String(key.id) === normalizedRef ||
        key.name === normalizedRef ||
        key.fingerprint === normalizedRef,
    );

    if (!matchedKey) {
      throw new Error(`Unable to resolve DigitalOcean SSH key reference "${normalizedRef}".`);
    }

    return String(matchedKey.id);
  });

  return [...new Set(resolvedIds)];
};

const findDroplet = async (instanceRef: string) => {
  const normalizedRef = instanceRef.trim();
  const droplets = await listDroplets();

  return droplets.find(
    (droplet) => String(droplet.id) === normalizedRef || droplet.name === normalizedRef,
  );
};

const sshArgsFor = (ipAddress: string, remoteCommand?: string) => {
  const args = [
    '-o',
    'StrictHostKeyChecking=no',
    '-o',
    'UserKnownHostsFile=/dev/null',
    '-o',
    'ConnectTimeout=10',
  ];

  return getSshIdentityPath().then((identityPath) => {
    const resolvedArgs = [...args];

    if (identityPath) {
      resolvedArgs.push('-i', identityPath);
    }

    resolvedArgs.push(`${SSH_USER}@${ipAddress}`);

    if (remoteCommand) {
      resolvedArgs.push(remoteCommand);
    }

    return resolvedArgs;
  });
};

const scpArgsFor = (fromPath: string, toPath: string) =>
  getSshIdentityPath().then((identityPath) => {
    const args = [
      '-o',
      'StrictHostKeyChecking=no',
      '-o',
      'UserKnownHostsFile=/dev/null',
      '-o',
      'ConnectTimeout=10',
    ];

    if (identityPath) {
      args.push('-i', identityPath);
    }

    args.push(fromPath, `${SSH_USER}@${toPath}`);
    return args;
  });

const waitForSsh = async (ipAddress: string) => {
  const deadline = Date.now() + SSH_WAIT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      await runProcess('ssh', await sshArgsFor(ipAddress, 'true'), { timeoutMs: 15_000 });
      return;
    } catch {
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 5_000));
    }
  }

  throw new Error(`Timed out waiting for SSH on ${ipAddress}.`);
};

const uploadPayload = async (ipAddress: string) => {
  const identityPath = await getSshIdentityPath();
  const identityArgs = identityPath
    ? `-i ${JSON.stringify(identityPath)} -o IdentitiesOnly=yes`
    : '';
  const tarCommand = [
    'tar',
    '--exclude=forks/openclaw/.git',
    '--exclude=**/node_modules',
    '-czf',
    '-',
    '-C',
    REPO_ROOT,
    'apps/instance-wrapper',
    'forks/openclaw',
    'scripts/bootstrap',
    'infrastructure/bootstrap',
  ];
  const sshCommand = `ssh ${identityArgs} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10 ${SSH_USER}@${ipAddress} 'mkdir -p ${SAGE_ROOT} && tar -xzf - -C ${SAGE_ROOT}'`;

  await runProcess('bash', ['-lc', `${tarCommand.join(' ')} | ${sshCommand}`], {
    timeoutMs: 10 * 60 * 1000,
  });
};

const writeProvisioningEnvFile = async () => {
  const baseEnv = await getSecretEnvContent();
  const gatewayToken = randomUUID();
  const hookToken = randomUUID();
  const tempFilePath = join(tmpdir(), `sage-openclaw-${Date.now()}.env`);
  const envContent = [
    baseEnv.trim(),
    `SAGE_OC_GATEWAY_TOKEN=${gatewayToken}`,
    `SAGE_OC_HOOK_TOKEN=${hookToken}`,
    'OC_CHAT_AGENT_ID=main',
    '',
  ].join('\n');

  await writeFile(tempFilePath, envContent, 'utf8');

  return { gatewayToken, hookToken, tempFilePath };
};

const uploadSecretEnv = async (ipAddress: string, localEnvPath: string) => {
  await runProcess('ssh', await sshArgsFor(ipAddress, 'mkdir -p /etc/sage && chmod 700 /etc/sage'));
  await runProcess('scp', await scpArgsFor(localEnvPath, `${ipAddress}:${REMOTE_ENV_FILE}`), {
    timeoutMs: 60_000,
  });
  await runProcess('ssh', await sshArgsFor(ipAddress, `chmod 600 ${REMOTE_ENV_FILE}`));
};

const runRemoteBootstrap = async (ipAddress: string) => {
  await runProcess(
    'ssh',
    await sshArgsFor(
      ipAddress,
      `SAGE_ROOT=${SAGE_ROOT} SAGE_ENV_FILE=${REMOTE_ENV_FILE} bash ${SAGE_ROOT}/scripts/bootstrap/bootstrap-instance-droplet.sh`,
    ),
    { timeoutMs: DEPLOY_WAIT_TIMEOUT_MS },
  );
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

const waitForRemoteOpenClaw = async (ipAddress: string) => {
  const deadline = Date.now() + DEPLOY_WAIT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      await runProcess(
        'ssh',
        await sshArgsFor(ipAddress, 'curl -sf http://127.0.0.1:19001/health >/dev/null'),
        { timeoutMs: 20_000 },
      );
      return;
    } catch {
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 5_000));
    }
  }

  throw new Error(`Timed out waiting for OpenClaw on ${ipAddress}.`);
};

const verifyChatProxy = async (ipAddress: string) => {
  const response = await fetch(`http://${ipAddress}/api/chat`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Reply with ready.',
      conversationId: `provisioning-check-${Date.now()}`,
      communicationType: 'chat',
    }),
  });

  if (!response.ok) {
    throw new Error(`Chat proxy health check failed with status ${response.status}.`);
  }

  const body = await response.text();
  if (!body.includes('data:')) {
    throw new Error('Chat proxy health check returned an unexpected response body.');
  }
};

const createDroplet = async (request: CreateInstanceRequest): Promise<CreatedInstanceResponse> => {
  const name = request.name.trim();
  const region = request.region?.trim() || DEFAULT_REGION;
  const size = DEFAULT_SIZE;
  const image = DEFAULT_IMAGE;
  const sshKeyRefs = DEFAULT_SSH_KEY_REFS;
  const sshKeyIds = await resolveSshKeyIds(sshKeyRefs);
  const tags = DEFAULT_TAGS;

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
    '--wait',
    '--output',
    'json',
  ];

  if (tags.length > 0) {
    args.push('--tag-names', tags.join(','));
  }

  const output = await runDoctl(args);
  const [droplet] = JSON.parse(output) as DropletRecord[];
  const ipAddress =
    droplet?.public_ipv4 ||
    droplet?.networks?.v4?.find((network) => network.type === 'public')?.ip_address;

  if (!ipAddress) {
    throw new Error('DigitalOcean did not return a public IPv4 address.');
  }

  return {
    createdAt: new Date().toISOString(),
    image,
    instanceId: String(droplet.id),
    ipAddress,
    name: droplet.name,
    region,
    size,
    status: 'created',
  };
};

const provisionInstance = async (request: CreateInstanceRequest): Promise<CreatedInstanceResponse> => {
  const droplet = await createDroplet(request);
  await waitForSsh(droplet.ipAddress);

  const { tempFilePath } = await writeProvisioningEnvFile();

  try {
    await uploadPayload(droplet.ipAddress);
    await uploadSecretEnv(droplet.ipAddress, tempFilePath);
    await runRemoteBootstrap(droplet.ipAddress);
    await waitForRemoteOpenClaw(droplet.ipAddress);
    await waitForHttp(`http://${droplet.ipAddress}/api/health`, DEPLOY_WAIT_TIMEOUT_MS);
    await verifyChatProxy(droplet.ipAddress);
  } finally {
    await unlink(tempFilePath).catch(() => {});
  }

  return droplet;
};

const destroyInstance = async (instanceRef: string): Promise<DeletedInstanceResponse> => {
  const droplet = await findDroplet(instanceRef);

  if (!droplet) {
    throw new Error(`Droplet "${instanceRef}" was not found.`);
  }

  await runDoctl(['compute', 'droplet', 'delete', '--force', String(droplet.id)]);

  return {
    deletedAt: new Date().toISOString(),
    instanceId: String(droplet.id),
    name: droplet.name,
    status: 'deleted',
  };
};

const getInstanceStatus = async (instanceRef: string): Promise<InstanceStatusResponse | null> => {
  const droplet = await findDroplet(instanceRef);

  if (!droplet) {
    return null;
  }

  return {
    image: droplet.image?.slug,
    instanceId: String(droplet.id),
    ipAddress:
      droplet.public_ipv4 ||
      droplet.networks?.v4?.find((network) => network.type === 'public')?.ip_address,
    name: droplet.name,
    region: droplet.region?.slug,
    size: droplet.size_slug || droplet.size?.slug,
    status: droplet.status || 'unknown',
  };
};

const listInstanceStatuses = async (): Promise<InstanceListResponse> => {
  const droplets = await listDroplets();

  return {
    instances: droplets.map((droplet) => ({
      image: droplet.image?.slug,
      instanceId: String(droplet.id),
      ipAddress:
        droplet.public_ipv4 ||
        droplet.networks?.v4?.find((network) => network.type === 'public')?.ip_address,
      name: droplet.name,
      region: droplet.region?.slug,
      size: droplet.size_slug || droplet.size?.slug,
      status: droplet.status || 'unknown',
    })),
  };
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || `${HOST}:${PORT}`}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      const payload: ProvisioningHealthResponse = {
        apiBaseUrl: API_BASE_URL,
        defaultImage: DEFAULT_IMAGE,
        defaultRegion: DEFAULT_REGION,
        defaultSize: DEFAULT_SIZE,
        ok: true,
      };
      sendJson(res, 200, payload);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/instances') {
      const body = await readJsonBody<unknown>(req);

      if (!isCreateInstanceRequest(body)) {
        sendJson(res, 400, {
          error: 'Invalid create-instance request body.',
          expected: {
            name: 'string',
            region: 'string?',
          },
        });
        return;
      }

      const response = await provisionInstance(body);
      sendJson(res, 201, response);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/instances') {
      const response = await listInstanceStatuses();
      sendJson(res, 200, response);
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
        sendJson(res, 404, { error: `Droplet "${instanceRef}" was not found.` });
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
