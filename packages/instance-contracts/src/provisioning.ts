import type { InstanceId, IsoTimestamp, UrlString } from '@sage/shared-types';

export interface CreateInstanceRequest {
  name: string;
  region?: string;
}

export interface CreatedInstanceResponse {
  createdAt: IsoTimestamp;
  image: string;
  instanceId: InstanceId;
  ipAddress: string;
  name: string;
  region: string;
  size: string;
  status: 'created' | 'provisioning' | 'ready' | 'error';
  error?: string;
}

export interface DeletedInstanceResponse {
  deletedAt: IsoTimestamp;
  instanceId: InstanceId;
  name: string;
  status: 'deleted';
}

export interface InstanceStatusResponse {
  image?: string;
  instanceId: InstanceId;
  ipAddress?: string;
  name: string;
  region?: string;
  size?: string;
  status: string;
  error?: string;
}

export interface InstanceListResponse {
  instances: InstanceStatusResponse[];
}

export interface ProvisioningHealthResponse {
  apiBaseUrl: UrlString;
  defaultImage: string;
  defaultRegion: string;
  defaultSize: string;
  ok: true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isCreateInstanceRequest(value: unknown): value is CreateInstanceRequest {
  if (!isRecord(value) || !isNonEmptyString(value.name)) {
    return false;
  }

  if (value.region !== undefined && !isNonEmptyString(value.region)) {
    return false;
  }

  return true;
}
