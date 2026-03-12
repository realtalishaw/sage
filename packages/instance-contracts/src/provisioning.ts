import type { InstanceId, IsoTimestamp, UrlString } from '@sage/shared-types';

export interface CreateInstanceRequest {
  name: string;
  ownerUserId: string;
  requestedSlug?: string;
  region?: string;
}

export type InstanceProvisioningStatus = 'queued' | 'created' | 'provisioning' | 'ready' | 'error' | 'deleted';

export interface CreatedInstanceResponse {
  createdAt: IsoTimestamp;
  image: string;
  instanceId: InstanceId;
  dropletId?: string;
  ipAddress: string;
  name: string;
  ownerUserId: string;
  primaryDomain: string | null;
  region: string;
  size: string;
  slug: string;
  status: InstanceProvisioningStatus;
  error?: string;
}

export interface DeletedInstanceResponse {
  deletedAt: IsoTimestamp;
  instanceId: InstanceId;
  dropletId?: string;
  name: string;
  ownerUserId: string;
  primaryDomain: string | null;
  slug: string;
  status: 'deleted';
}

export interface InstanceStatusResponse {
  image?: string;
  instanceId: InstanceId;
  dropletId?: string;
  ipAddress?: string;
  name: string;
  ownerUserId: string;
  primaryDomain: string | null;
  region?: string;
  size?: string;
  slug: string;
  status: InstanceProvisioningStatus | string;
  step?: string;
  readyAt?: IsoTimestamp | null;
  deletedAt?: IsoTimestamp | null;
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
  if (!isRecord(value) || !isNonEmptyString(value.name) || !isNonEmptyString(value.ownerUserId)) {
    return false;
  }

  if (value.requestedSlug !== undefined && !isNonEmptyString(value.requestedSlug)) {
    return false;
  }

  if (value.region !== undefined && !isNonEmptyString(value.region)) {
    return false;
  }

  return true;
}
