-- Baseline (documentación) de las tablas de la Fase Pro que ya fueron
-- ejecutadas manualmente contra el proyecto de Supabase. Este archivo
-- deja el esquema versionado en el repo; usa IF NOT EXISTS / guards para
-- ser seguro de re-ejecutar sin duplicar objetos.

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text,
  phone text,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.availability
  add column if not exists employee_id uuid references public.employees(id) on delete cascade;

alter table public.appointments
  add column if not exists employee_id uuid references public.employees(id) on delete set null,
  add column if not exists deposit_amount numeric default 0,
  add column if not exists deposit_status text default 'unpaid';

do $$ begin
  if not exists (select 1 from pg_type where typname = 'deposit_status') then
    create type deposit_status as enum ('unpaid', 'paid', 'refunded');
  end if;
end $$;

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  sku text,
  current_stock numeric default 0,
  min_stock numeric default 0,
  unit text,
  created_at timestamptz default now()
);

create table if not exists public.service_inventory (
  service_id uuid not null references public.services(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  quantity_required numeric not null,
  primary key (service_id, item_id)
);

create table if not exists public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  quantity numeric not null,
  type text,
  reason text,
  created_at timestamptz default now()
);

create table if not exists public.waiting_list (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  client_id uuid not null references public.users(id) on delete cascade,
  preferred_date date,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  code text not null,
  discount_type text,
  value numeric not null,
  expires_at timestamptz,
  usage_limit integer,
  used_count integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.employees enable row level security;
alter table public.inventory_items enable row level security;
alter table public.service_inventory enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.waiting_list enable row level security;
alter table public.coupons enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'employees' and policyname = 'Owners manage employees') then
    create policy "Owners manage employees" on public.employees for all
      using (auth.uid() in (select owner_id from public.businesses where id = employees.business_id));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'employees' and policyname = 'Public read employees') then
    create policy "Public read employees" on public.employees for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'inventory_items' and policyname = 'Owners manage inventory') then
    create policy "Owners manage inventory" on public.inventory_items for all
      using (auth.uid() in (select owner_id from public.businesses where id = inventory_items.business_id));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'waiting_list' and policyname = 'Owners manage waiting list') then
    create policy "Owners manage waiting list" on public.waiting_list for all
      using (auth.uid() in (select owner_id from public.businesses where id = waiting_list.business_id));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'waiting_list' and policyname = 'Clients manage own waiting list') then
    create policy "Clients manage own waiting list" on public.waiting_list for select using (auth.uid() = client_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'coupons' and policyname = 'Owners manage coupons') then
    create policy "Owners manage coupons" on public.coupons for all
      using (auth.uid() in (select owner_id from public.businesses where id = coupons.business_id));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'coupons' and policyname = 'Public read active coupons') then
    create policy "Public read active coupons" on public.coupons for select using (is_active = true);
  end if;
end $$;
