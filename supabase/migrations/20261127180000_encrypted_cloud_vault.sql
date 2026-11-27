-- One opaque encrypted snapshot per authenticated owner.
-- The client encrypts the complete backup before this table is reached.
create table if not exists public.encrypted_vaults (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  constraint encrypted_vaults_payload_object check (jsonb_typeof(payload) = 'object')
);

alter table public.encrypted_vaults enable row level security;
alter table public.encrypted_vaults force row level security;

revoke all on table public.encrypted_vaults from anon;
revoke all on table public.encrypted_vaults from authenticated;
grant select, insert, update on table public.encrypted_vaults to authenticated;

drop policy if exists "Users can read own encrypted vault" on public.encrypted_vaults;
create policy "Users can read own encrypted vault"
  on public.encrypted_vaults for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create own encrypted vault" on public.encrypted_vaults;
create policy "Users can create own encrypted vault"
  on public.encrypted_vaults for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own encrypted vault" on public.encrypted_vaults;
create policy "Users can update own encrypted vault"
  on public.encrypted_vaults for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
