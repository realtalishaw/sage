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
const SECRET_ENV_CONTENT_B64 = process.env.SAGE_PROVISIONING_SECRET_ENV_CONTENT_B64;
const DEPLOY_WAIT_TIMEOUT_MS = Number(process.env.SAGE_DEPLOY_WAIT_TIMEOUT_MS || 20 * 60 * 1000);
const BUNDLE_TTL_MS = Number(process.env.SAGE_PROVISIONING_BUNDLE_TTL_MS || 30 * 60 * 1000);
const OPENCLAW_ARCHIVE_URL =
  process.env.SAGE_OPENCLAW_ARCHIVE_URL || 'https://codeload.github.com/realtalishaw/openclaw/tar.gz/refs/heads/main';
const SAGE_ROOT = '/opt/sage';
const REMOTE_ENV_FILE = '/etc/sage/openclaw.env';

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

type ProvisioningRecord = {
  error?: string;
  status: 'provisioning' | 'ready' | 'error';
};

type CommandOptions = {
  cwd?: string;
  input?: string;
  timeoutMs?: number;
};

const bundleStore = new Map<string, BundleRecord>();
const provisioningStore = new Map<string, ProvisioningRecord>();

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
  if (SECRET_ENV_CONTENT_B64 && SECRET_ENV_CONTENT_B64.trim().length > 0) {
    return Buffer.from(SECRET_ENV_CONTENT_B64, 'base64').toString('utf8').trim();
  }

  if (SECRET_ENV_CONTENT && SECRET_ENV_CONTENT.trim().length > 0) {
    return SECRET_ENV_CONTENT.trim();
  }

  await access(SECRET_ENV_PATH);
  return (await readFile(SECRET_ENV_PATH, 'utf8')).trim();
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
    {
      timeoutMs: 5 * 60 * 1000,
    },
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
    {
      timeoutMs: 10 * 60 * 1000,
    },
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

const setProvisioningRecord = (instanceRef: string, record: ProvisioningRecord) => {
  provisioningStore.set(instanceRef, record);
};

const getProvisioningRecord = (instanceRef: string) => provisioningStore.get(instanceRef);

const buildProvisioningEnvContent = async () => {
  const baseEnv = await getSecretEnvContent();
  const gatewayToken = randomUUID();
  const hookToken = randomUUID();

  return [
    baseEnv.trim(),
    `SAGE_OC_GATEWAY_TOKEN=${gatewayToken}`,
    `SAGE_OC_HOOK_TOKEN=${hookToken}`,
    'OC_CHAT_AGENT_ID=main',
    '',
  ].join('\n');
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

const createDroplet = async (
  request: CreateInstanceRequest,
  userData: string,
): Promise<CreatedInstanceResponse> => {
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

const waitForRemoteOpenClaw = async (ipAddress: string) => {
  const deadline = Date.now() + DEPLOY_WAIT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://${ipAddress}/api/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // ignore while waiting
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 5_000));
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

const overlayProvisioningState = (state: {
  error?: string;
  instanceId: string;
  name: string;
  status: string;
}) => {
  const record = getProvisioningRecord(state.instanceId) || getProvisioningRecord(state.name);

  if (!record) {
    return state;
  }

  return {
    ...state,
    error: record.error,
    status: record.status,
  };
};

const finalizeProvisioning = async (droplet: CreatedInstanceResponse, bundleId: string) => {
  setProvisioningRecord(droplet.instanceId, { status: 'provisioning' });
  setProvisioningRecord(droplet.name, { status: 'provisioning' });

  try {
    await waitForRemoteOpenClaw(droplet.ipAddress);
    await waitForHttp(`http://${droplet.ipAddress}/api/health`, DEPLOY_WAIT_TIMEOUT_MS);
    await verifyChatProxy(droplet.ipAddress);
    setProvisioningRecord(droplet.instanceId, { status: 'ready' });
    setProvisioningRecord(droplet.name, { status: 'ready' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown provisioning error';
    setProvisioningRecord(droplet.instanceId, { status: 'error', error: message });
    setProvisioningRecord(droplet.name, { status: 'error', error: message });
  } finally {
    await deleteProvisioningBundle(bundleId);
  }
};

const provisionInstance = async (
  request: CreateInstanceRequest,
  publicBaseUrl: string,
): Promise<CreatedInstanceResponse> => {
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
    void finalizeProvisioning(droplet, bundleId);

    return {
      ...droplet,
      status: 'provisioning' as const,
    };
  } catch (error) {
    await deleteProvisioningBundle(bundleId);
    throw error;
  }
};

const destroyInstance = async (instanceRef: string): Promise<DeletedInstanceResponse> => {
  const droplet = await findDroplet(instanceRef);

  if (!droplet) {
    throw new Error(`Droplet "${instanceRef}" was not found.`);
  }

  await runDoctl(['compute', 'droplet', 'delete', '--force', String(droplet.id)]);
  provisioningStore.delete(String(droplet.id));
  provisioningStore.delete(droplet.name);

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

  const provisioningState = overlayProvisioningState({
    instanceId: String(droplet.id),
    name: droplet.name,
    status: droplet.status || 'unknown',
  });

  return {
    image: droplet.image?.slug,
    instanceId: String(droplet.id),
    ipAddress:
      droplet.public_ipv4 ||
      droplet.networks?.v4?.find((network) => network.type === 'public')?.ip_address,
    name: droplet.name,
    region: droplet.region?.slug,
    size: droplet.size_slug || droplet.size?.slug,
    status: provisioningState.status,
    error: provisioningState.error,
  };
};

const listInstanceStatuses = async (): Promise<InstanceListResponse> => {
  const droplets = await listDroplets();

  return {
    instances: droplets.map((droplet) => {
      const provisioningState = overlayProvisioningState({
        instanceId: String(droplet.id),
        name: droplet.name,
        status: droplet.status || 'unknown',
      });

      return {
        image: droplet.image?.slug,
        instanceId: String(droplet.id),
        ipAddress:
          droplet.public_ipv4 ||
          droplet.networks?.v4?.find((network) => network.type === 'public')?.ip_address,
        name: droplet.name,
        region: droplet.region?.slug,
        size: droplet.size_slug || droplet.size?.slug,
        status: provisioningState.status,
        error: provisioningState.error,
      };
    }),
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
