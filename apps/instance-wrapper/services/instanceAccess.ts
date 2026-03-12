import { supabase } from '@/src/integrations/supabase/client';

export interface InstanceAccess {
  instanceId: string;
  ownerUserId: string;
  slug: string;
  primaryDomain: string | null;
  ipAddress?: string;
}

let cachedAccess: InstanceAccess | null = null;
let inflightAccess: Promise<InstanceAccess> | null = null;

export const clearInstanceAccessCache = () => {
  cachedAccess = null;
  inflightAccess = null;
};

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token || null;
}

export async function getCurrentInstanceAccess(force = false): Promise<InstanceAccess> {
  if (!force && cachedAccess) {
    return cachedAccess;
  }

  if (!force && inflightAccess) {
    return inflightAccess;
  }

  inflightAccess = (async () => {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('/api/instance-access', {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error || 'Unable to verify instance access.');
    }

    const payload = (await response.json()) as InstanceAccess;
    cachedAccess = payload;
    return payload;
  })();

  try {
    return await inflightAccess;
  } finally {
    inflightAccess = null;
  }
}

export async function getCurrentInstanceId(force = false) {
  const access = await getCurrentInstanceAccess(force);
  return access.instanceId;
}
