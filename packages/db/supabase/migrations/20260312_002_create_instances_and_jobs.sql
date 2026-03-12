-- =============================================================================
-- Instance registry and provisioning jobs
-- Created: 2026-03-12
-- Description: canonical ownership and routing metadata for provisioned Sage instances
-- =============================================================================

create table if not exists public.instances (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  droplet_id text unique,
  droplet_name text,
  ip_address text unique,
  slug text not null unique,
  primary_domain text unique,
  region text,
  size text,
  image text,
  status text not null default 'queued',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ready_at timestamptz,
  deleted_at timestamptz
);

create index if not exists idx_instances_owner_user_id on public.instances(owner_user_id);
create index if not exists idx_instances_status on public.instances(status);
create index if not exists idx_instances_created_at on public.instances(created_at desc);

drop trigger if exists trigger_instances_updated_at on public.instances;
create trigger trigger_instances_updated_at
  before update on public.instances
  for each row
  execute function update_updated_at();

alter table public.instances enable row level security;

drop policy if exists "Owners can read own instances" on public.instances;
create policy "Owners can read own instances"
  on public.instances for select
  using (owner_user_id = auth.uid());

drop policy if exists "Service role manages instances" on public.instances;
create policy "Service role manages instances"
  on public.instances for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

comment on table public.instances is 'Canonical registry for provisioned Sage instances and their owner/routing metadata.';
comment on column public.instances.slug is 'Stable product slug used for future slug.joinsage.app routing.';
comment on column public.instances.primary_domain is 'Canonical public domain when DNS is attached.';

create table if not exists public.instance_jobs (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.instances(id) on delete cascade,
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'queued',
  step text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_instance_jobs_instance_id on public.instance_jobs(instance_id, created_at desc);
create index if not exists idx_instance_jobs_owner_user_id on public.instance_jobs(owner_user_id);
create index if not exists idx_instance_jobs_status on public.instance_jobs(status);

drop trigger if exists trigger_instance_jobs_updated_at on public.instance_jobs;
create trigger trigger_instance_jobs_updated_at
  before update on public.instance_jobs
  for each row
  execute function update_updated_at();

alter table public.instance_jobs enable row level security;

drop policy if exists "Owners can read own instance jobs" on public.instance_jobs;
create policy "Owners can read own instance jobs"
  on public.instance_jobs for select
  using (owner_user_id = auth.uid());

drop policy if exists "Service role manages instance jobs" on public.instance_jobs;
create policy "Service role manages instance jobs"
  on public.instance_jobs for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

comment on table public.instance_jobs is 'Provisioning lifecycle records for Sage instances.';
