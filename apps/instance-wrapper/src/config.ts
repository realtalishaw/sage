import { randomUUID } from 'node:crypto';

// The wrapper config is intentionally small for the first pass. It covers only
// the pieces needed to stand up the boundary between Sage callers and the
// private OpenClaw worker on the same droplet.
export interface InstanceWrapperConfig {
  callbackBaseUrl?: string;
  callbackSigningSecret?: string;
  gatewayBaseUrl: string;
  openClawHookAgentId: string;
  openClawHookPath: string;
  openClawHookToken?: string;
  instanceId: string;
  listenHost: string;
  listenPort: number;
  useRealOpenClawHooks: boolean;
  signingKeyId: string;
  signingSecret: string;
}

function parsePort(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

// We generate a dev-only fallback secret so local bootstrapping is frictionless.
// Production provisioning should always inject a real secret through the env.
function resolveSigningSecret(): string {
  return process.env.INSTANCE_WRAPPER_SIGNING_SECRET ?? `dev-secret-${randomUUID()}`;
}

// This central loader keeps env parsing out of route handlers so the server can
// stay deterministic and easy to test.
export function loadInstanceWrapperConfig(): InstanceWrapperConfig {
  return {
    callbackBaseUrl: process.env.INSTANCE_WRAPPER_CALLBACK_BASE_URL,
    callbackSigningSecret: process.env.INSTANCE_WRAPPER_CALLBACK_SIGNING_SECRET,
    gatewayBaseUrl: process.env.OC_GATEWAY_BASE_URL ?? 'http://127.0.0.1:18789',
    openClawHookAgentId: process.env.OC_HOOK_AGENT_ID ?? 'main',
    openClawHookPath: process.env.OC_HOOK_PATH ?? '/hooks/agent',
    openClawHookToken: process.env.OC_HOOK_TOKEN,
    instanceId: process.env.INSTANCE_ID ?? 'dev-instance',
    listenHost: process.env.INSTANCE_WRAPPER_HOST ?? '127.0.0.1',
    listenPort: parsePort(process.env.INSTANCE_WRAPPER_PORT, 3000),
    useRealOpenClawHooks: process.env.OC_USE_REAL_HOOKS === '1',
    signingKeyId: process.env.INSTANCE_WRAPPER_SIGNING_KEY_ID ?? 'dev-key',
    signingSecret: resolveSigningSecret(),
  };
}
