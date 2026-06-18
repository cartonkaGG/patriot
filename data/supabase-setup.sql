-- Patriot Store — Supabase schema
-- Run in Supabase Dashboard → SQL Editor

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  phone text,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Якщо таблиця вже існує без email:
alter table public.profiles add column if not exists email text;

create table if not exists public.orders (
  id bigserial primary key,
  user_id uuid references auth.users on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  delivery jsonb not null default '{}',
  payment text not null,
  comment text,
  items jsonb not null default '[]',
  total numeric not null default 0,
  status text not null default 'new',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.orders enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Anyone can create orders"
  on public.orders for insert
  with check (true);

create policy "Users can view own orders"
  on public.orders for select
  using (auth.uid() = user_id);

create policy "Users can update own orders status view"
  on public.orders for update
  using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
