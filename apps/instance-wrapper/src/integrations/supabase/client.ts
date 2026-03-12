import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

type MockUser = {
  id: string;
  email: string;
};

type QueryResult<T> = Promise<{ data: T; error: null }>;

type Row = Record<string, any>;

const AUTH_STORAGE_KEY = 'mock-supabase-user';
const DEFAULT_USER_ID = 'user-demo';

const now = Date.now();

const mockDb: Record<string, Row[]> = {
  profiles: [
    {
      id: DEFAULT_USER_ID,
      email: 'operator@openclaw.dev',
      first_name: 'Sage',
      last_name: 'Operator',
      profile_image_url: null,
      is_admin: false,
      onboarding_completed: true,
      waitlist_position: 128,
    },
  ],
  invite_codes: [
    { code: 'SAGE-ALPHA-01', used_by: null, used_at: null, created_by: DEFAULT_USER_ID, created_at: new Date(now).toISOString() },
    { code: 'SAGE-ALPHA-02', used_by: null, used_at: null, created_by: DEFAULT_USER_ID, created_at: new Date(now - 1000).toISOString() },
    { code: 'SAGE-ALPHA-03', used_by: null, used_at: null, created_by: DEFAULT_USER_ID, created_at: new Date(now - 2000).toISOString() },
  ],
  apps: [
    {
      id: 'app-gmail',
      user_id: DEFAULT_USER_ID,
      app_name: 'Gmail',
      app_slug: 'gmail',
      description: 'Email workflows and inbox context.',
      status: 'connected',
      metadata: { category: 'Communication' },
      created_at: new Date(now - 86400000).toISOString(),
    },
    {
      id: 'app-slack',
      user_id: DEFAULT_USER_ID,
      app_name: 'Slack',
      app_slug: 'slack',
      description: 'Team communication and channel summaries.',
      status: 'connected',
      metadata: { category: 'Communication' },
      created_at: new Date(now - 172800000).toISOString(),
    },
    {
      id: 'app-calendar',
      user_id: DEFAULT_USER_ID,
      app_name: 'Google Calendar',
      app_slug: 'google-calendar',
      description: 'Scheduling and meeting prep.',
      status: 'connected',
      metadata: { category: 'Calendar' },
      created_at: new Date(now - 259200000).toISOString(),
    },
  ],
  artifacts: [
    {
      id: 'artifact-1',
      user_id: DEFAULT_USER_ID,
      agent_slug: 'core-agent',
      output_url: 'https://example.com/meeting-brief.md',
      output_text: '# Meeting Brief\n\nPrototype artifact output.',
      metadata: {},
      created_at: new Date(now - 3600000).toISOString(),
    },
    {
      id: 'artifact-2',
      user_id: DEFAULT_USER_ID,
      agent_slug: 'research-agent',
      output_url: 'https://example.com/pipeline-summary.pdf',
      output_text: null,
      metadata: {},
      created_at: new Date(now - 7200000).toISOString(),
    },
  ],
  files: [
    {
      id: 'file-folder-1',
      user_id: DEFAULT_USER_ID,
      name: 'Board Prep',
      type: 'folder',
      mime_type: null,
      size: null,
      parent_folder_id: null,
      storage_path: null,
      is_favorite: true,
      tags: [],
      metadata: {},
      created_at: new Date(now - 86400000).toISOString(),
      updated_at: new Date(now - 86400000).toISOString(),
    },
    {
      id: 'file-1',
      user_id: DEFAULT_USER_ID,
      name: 'meeting-notes.md',
      type: 'doc',
      mime_type: 'text/markdown',
      size: 2048,
      parent_folder_id: 'file-folder-1',
      storage_path: 'demo/meeting-notes.md',
      is_favorite: false,
      tags: ['notes'],
      metadata: {},
      created_at: new Date(now - 5400000).toISOString(),
      updated_at: new Date(now - 5400000).toISOString(),
    },
    {
      id: 'file-2',
      user_id: DEFAULT_USER_ID,
      name: 'q1-plan.pdf',
      type: 'pdf',
      mime_type: 'application/pdf',
      size: 4096,
      parent_folder_id: null,
      storage_path: 'demo/q1-plan.pdf',
      is_favorite: true,
      tags: ['strategy'],
      metadata: {},
      created_at: new Date(now - 10800000).toISOString(),
      updated_at: new Date(now - 10800000).toISOString(),
    },
  ],
  workstream_events: [
    {
      id: 'ws-1',
      user_id: DEFAULT_USER_ID,
      event_type: 'agent_message',
      message:
        'OpenClaw wrapper shell is staged. This prototype mirrors the original app UI while keeping everything local.',
      attachments: [],
      event_data: {},
      metadata: { is_agent: true, author_name: 'GIA Agent' },
      created_at: new Date(now - 3600000).toISOString(),
      is_read: true,
      reaction_count: 0,
      task_id: null,
      agent_task_id: null,
    },
    {
      id: 'ws-2',
      user_id: DEFAULT_USER_ID,
      event_type: 'user_message',
      message: 'Copy the whole app over first, then strip the backend.',
      attachments: [],
      event_data: {},
      metadata: { is_agent: false, author_name: 'You' },
      created_at: new Date(now - 3000000).toISOString(),
      is_read: true,
      reaction_count: 0,
      task_id: null,
      agent_task_id: null,
    },
    {
      id: 'ws-3',
      user_id: DEFAULT_USER_ID,
      event_type: 'agent_message',
      message:
        'Done. The UI remains intact, but backend behavior is mocked so the prototype stays frontend-only.',
      attachments: [],
      event_data: {},
      metadata: { is_agent: true, author_name: 'GIA Agent' },
      created_at: new Date(now - 2400000).toISOString(),
      is_read: true,
      reaction_count: 0,
      task_id: null,
      agent_task_id: null,
    },
  ],
  user_tasks: [
    {
      id: 'task-1',
      user_id: DEFAULT_USER_ID,
      action_required: 'Keep the wrapper prototype limited to the copied UI and mock data?',
      context: 'This preserves the exact frontend structure from the source app while removing live backend dependencies.',
      impact: 'You can review the full product shell without waiting on auth, tasks, or data contracts.',
      proposed_action: 'Ship the copied UI as a frontend-only prototype.',
      status: 'pending',
      metadata: {},
      created_at: new Date(now - 1800000).toISOString(),
      updated_at: new Date(now - 1800000).toISOString(),
      completed_at: null,
    },
  ],
  todo_list: [
    {
      id: 'todo-1',
      user_id: DEFAULT_USER_ID,
      task: 'Audit copied routes against wrapper scope',
      task_id: null,
      date: new Date().toLocaleDateString('en-CA'),
      completed: false,
      completed_at: null,
      created_at: new Date(now - 1200000).toISOString(),
      updated_at: new Date(now - 1200000).toISOString(),
      task_status: null,
      task_error: null,
    },
    {
      id: 'todo-2',
      user_id: DEFAULT_USER_ID,
      task: 'Swap mock auth for real wrapper auth later',
      task_id: null,
      date: new Date().toLocaleDateString('en-CA'),
      completed: false,
      completed_at: null,
      created_at: new Date(now - 1100000).toISOString(),
      updated_at: new Date(now - 1100000).toISOString(),
      task_status: null,
      task_error: null,
    },
  ],
  tasks: [],
  onboarding_sessions: [
    {
      id: 'onboarding-1',
      user_id: DEFAULT_USER_ID,
      current_step: 5,
      completed_steps: [1, 2, 3, 4],
      communication_style: null,
      priorities: [],
      work_style: null,
      created_at: new Date(now - 86400000).toISOString(),
      updated_at: new Date(now - 3600000).toISOString(),
    },
  ],
  assistant_identity: [
    {
      id: 'identity-1',
      user_id: DEFAULT_USER_ID,
      assistant_name: 'Sage',
      assistant_tone: 'Strategic, calm, and direct',
      created_at: new Date(now - 86400000).toISOString(),
      updated_at: new Date(now - 3600000).toISOString(),
    },
  ],
  user_preferences: [],
  access_requests: [],
  fyp_showcases: [],
};

const authListeners = new Set<(event: string, session: { user: MockUser } | null) => void>();
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const browserSupabase = createClient<Database>(supabaseUrl, supabasePublishableKey);
const REAL_TABLES = new Set([
  'instances',
  'instance_jobs',
  'profiles',
  'apps',
  'artifacts',
  'assistant_identity',
  'files',
  'todo_list',
  'workstream_events',
]);
const REAL_RPCS = new Set([
  'add_workstream_reaction',
  'check_user_has_access',
  'generate_user_api_key',
  'ensure_three_invite_codes',
  'use_invite_code',
  'grant_free_trial_credit',
  'grant_invite_bonus_credit',
  'submit_feedback',
  'get_invite_code_details',
  'get_invite_code_creator_email',
]);

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function getStoredUser(): MockUser | null {
  if (!canUseStorage()) {
    return null;
  }

  const fromAuth = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (fromAuth) {
    try {
      return JSON.parse(fromAuth) as MockUser;
    } catch {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }

  const fromApp = window.localStorage.getItem('gia_user');
  if (!fromApp) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromApp) as { email?: string };
    return parsed.email ? { id: DEFAULT_USER_ID, email: parsed.email } : null;
  } catch {
    return null;
  }
}

function persistUser(user: MockUser | null) {
  if (!canUseStorage()) {
    return;
  }

  if (user) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

function notifyAuth(event: string, user: MockUser | null) {
  const session = user ? { user } : null;
  authListeners.forEach((listener) => listener(event, session));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function getRows(table: string): Row[] {
  if (!mockDb[table]) {
    mockDb[table] = [];
  }

  return mockDb[table];
}

class MockQueryBuilder<T extends Row = Row> implements PromiseLike<{ data: T | T[] | null; error: null }> {
  private filters: Array<(row: T) => boolean> = [];
  private limitCount: number | null = null;
  private singleRow = false;
  private orderField: string | null = null;
  private orderAscending = true;
  private mode: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: Row | Row[] | null = null;

  constructor(private table: string) {}

  select(): this {
    return this;
  }

  insert(payload: Row | Row[]): this {
    this.mode = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: Row): this {
    this.mode = 'update';
    this.payload = payload;
    return this;
  }

  delete(): this {
    this.mode = 'delete';
    return this;
  }

  eq(field: string, value: any): this {
    this.filters.push((row) => row[field] === value);
    return this;
  }

  lt(field: string, value: any): this {
    this.filters.push((row) => row[field] < value);
    return this;
  }

  order(field: string, options?: { ascending?: boolean }): this {
    this.orderField = field;
    this.orderAscending = options?.ascending ?? true;
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  single(): this {
    this.singleRow = true;
    return this;
  }

  then<TResult1 = { data: T | T[] | null; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: T | T[] | null; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as any, onrejected as any);
  }

  private async execute(): QueryResult<T | T[] | null> {
    const rows = getRows(this.table) as T[];

    if (this.mode === 'insert') {
      const payloadRows = (Array.isArray(this.payload) ? this.payload : [this.payload]).filter(Boolean) as T[];
      const inserted = payloadRows.map((row) => ({
        id: row.id ?? `${this.table}-${crypto.randomUUID()}`,
        created_at: row.created_at ?? new Date().toISOString(),
        updated_at: row.updated_at ?? new Date().toISOString(),
        ...row,
      }));

      rows.push(...inserted);
      return Promise.resolve({ data: this.singleRow ? clone(inserted[0] ?? null) : clone(inserted), error: null });
    }

    let filtered = rows.filter((row) => this.filters.every((predicate) => predicate(row)));

    if (this.mode === 'update') {
      filtered = filtered.map((row) => Object.assign(row, this.payload, { updated_at: new Date().toISOString() }));
      return Promise.resolve({ data: this.singleRow ? clone(filtered[0] ?? null) : clone(filtered), error: null });
    }

    if (this.mode === 'delete') {
      const matchingIds = new Set(filtered.map((row) => row.id));
      mockDb[this.table] = rows.filter((row) => !matchingIds.has(row.id));
      return Promise.resolve({ data: this.singleRow ? clone(filtered[0] ?? null) : clone(filtered), error: null });
    }

    if (this.orderField) {
      filtered = [...filtered].sort((left, right) => {
        const leftValue = left[this.orderField as keyof T];
        const rightValue = right[this.orderField as keyof T];

        if (leftValue === rightValue) {
          return 0;
        }

        const comparison = leftValue > rightValue ? 1 : -1;
        return this.orderAscending ? comparison : -comparison;
      });
    }

    if (this.limitCount !== null) {
      filtered = filtered.slice(0, this.limitCount);
    }

    return Promise.resolve({
      data: this.singleRow ? clone(filtered[0] ?? null) : clone(filtered),
      error: null,
    });
  }
}

const auth = {
  async getUser() {
    return await browserSupabase.auth.getUser();
  },
  async getSession() {
    return await browserSupabase.auth.getSession();
  },
  onAuthStateChange(callback: (event: string, session: { user: MockUser } | null) => void) {
    return browserSupabase.auth.onAuthStateChange(callback as never);
  },
  async signInWithOtp({ phone }: { phone: string }) {
    return await browserSupabase.auth.signInWithOtp({
      phone,
      options: {
        shouldCreateUser: true,
      },
    });
  },
  async verifyOtp({
    phone,
    token,
    type,
  }: {
    phone: string;
    token: string;
    type: 'sms' | 'phone_change';
  }) {
    return await browserSupabase.auth.verifyOtp({
      phone,
      token,
      type,
    });
  },
  async signOut() {
    return await browserSupabase.auth.signOut();
  },
  async updateUser() {
    return await browserSupabase.auth.updateUser({});
  },
};

const storage = {
  from(bucket: string) {
    return browserSupabase.storage.from(bucket);
  },
};

const functions = {
  async invoke(name: string) {
    switch (name) {
      case 'check-subscription':
        return { data: { subscribed: true, status: 'active', free_hours_remaining: 24 }, error: null };
      case 'create-checkout':
      case 'customer-portal':
        return { data: { url: '/app/home' }, error: null };
      case 'send-feedback-email':
      case 'send-access-request-email':
      case 'send-invite-emails':
        return { data: { success: true }, error: null };
      case 'composio-connections':
        return { data: { connections: [] }, error: null };
      default:
        return { data: { success: true }, error: null };
    }
  },
};

const realtimeChannel = {
  on() {
    return this;
  },
  subscribe() {
    return this;
  },
};

export const supabase = {
  auth,
  storage,
  functions,
  from(table: keyof Database['public']['Tables'] | string) {
    if (REAL_TABLES.has(String(table))) {
      return browserSupabase.from(table as keyof Database['public']['Tables']);
    }
    return new MockQueryBuilder(String(table));
  },
  async rpc(name: string, params?: Record<string, unknown>) {
    if (REAL_RPCS.has(name)) {
      return await browserSupabase.rpc(name as never, params as never);
    }

    switch (name) {
      case 'check_user_has_access':
        return { data: true, error: null };
      case 'generate_user_api_key':
        return { data: [{ full_key: `gia_mock_${DEFAULT_USER_ID}` }], error: null };
      case 'ensure_three_invite_codes':
        return { data: clone(mockDb.invite_codes), error: null };
      case 'use_invite_code':
      case 'grant_free_trial_credit':
      case 'grant_invite_bonus_credit':
      case 'submit_feedback':
        return { data: true, error: null };
      case 'get_invite_code_details':
        return { data: { created_by: DEFAULT_USER_ID, code: 'SAGE-ALPHA-01' }, error: null };
      case 'get_invite_code_creator_email':
        return { data: 'creator@openclaw.dev', error: null };
      case 'add_workstream_reaction':
        return { data: true, error: null };
      default:
        return { data: true, error: null };
    }
  },
  channel(name: string) {
    return browserSupabase.channel(name);
  },
  removeChannel(channel: ReturnType<typeof browserSupabase.channel>) {
    return browserSupabase.removeChannel(channel);
  },
} as any;
