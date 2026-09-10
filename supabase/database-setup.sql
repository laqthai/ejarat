-- Run this once in Supabase SQL Editor.
create table if not exists public.lease_contracts (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lease_payments (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lease_tenants (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lease_contracts enable row level security;
alter table public.lease_payments enable row level security;
alter table public.lease_tenants enable row level security;

drop policy if exists "Public can read lease contracts" on public.lease_contracts;
drop policy if exists "Public can write lease contracts" on public.lease_contracts;
create policy "Public can read lease contracts" on public.lease_contracts for select using (true);
create policy "Public can write lease contracts" on public.lease_contracts for all using (true) with check (true);

drop policy if exists "Public can read lease payments" on public.lease_payments;
drop policy if exists "Public can write lease payments" on public.lease_payments;
create policy "Public can read lease payments" on public.lease_payments for select using (true);
create policy "Public can write lease payments" on public.lease_payments for all using (true) with check (true);

drop policy if exists "Public can read lease tenants" on public.lease_tenants;
drop policy if exists "Public can write lease tenants" on public.lease_tenants;
create policy "Public can read lease tenants" on public.lease_tenants for select using (true);
create policy "Public can write lease tenants" on public.lease_tenants for all using (true) with check (true);