-- profiles (extends Supabase auth.users)
create table profiles (
  id uuid references auth.users primary key,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- groups
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references profiles(id),
  invite_token text unique,
  invite_expires_at timestamptz,
  created_at timestamptz default now()
);

-- group membership
create table group_members (
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text default 'member',
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- expenses
create table expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  paid_by uuid references profiles(id),
  amount numeric(10,2) not null,
  description text,
  category text default 'other',
  split_type text default 'equal',
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- how each expense is split per person
create table expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references expenses(id) on delete cascade,
  user_id uuid references profiles(id),
  amount numeric(10,2) not null,
  is_settled boolean default false
);

-- settlement records
create table settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id),
  paid_by uuid references profiles(id),
  paid_to uuid references profiles(id),
  amount numeric(10,2),
  settled_at timestamptz default now()
);