-- Team Ops Dashboard — schema
-- Paste this whole file into the Supabase SQL editor and run it once.

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text,
  initials text not null default '',
  color text not null default '#4f46e5',
  role text not null default 'member',
  claimed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists objectives (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  position int not null default 0,
  hue int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references objectives (id) on delete cascade,
  title text not null,
  weight int not null check (weight in (1, 2, 3)),
  status text not null default 'backlog' check (status in ('backlog', 'daily', 'done')),
  scheduled_date date,
  due_date date,
  completed_by uuid references profiles (id) on delete set null,
  completed_date date,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- A task can have zero or more assignees.
create table if not exists task_assignees (
  task_id uuid not null references tasks (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  primary key (task_id, profile_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists message_reads (
  profile_id uuid primary key references profiles (id) on delete cascade,
  last_read_at timestamptz not null default now()
);

create table if not exists important_dates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  time time,
  end_time time,
  type text not null default 'event' check (type in ('meeting', 'deadline', 'event')),
  note text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Adds end_time to important_dates created before this column existed, and backfills a 1-hour
-- default (capped at 23:55, same day) for any existing timed entry that's missing one.
alter table important_dates add column if not exists end_time time;
update important_dates
  set end_time = case
    when (time + interval '1 hour')::time < time then time '23:55:00'
    else (time + interval '1 hour')::time
  end
  where time is not null and end_time is null;
alter table important_dates drop constraint if exists important_dates_time_pair_check;
alter table important_dates add constraint important_dates_time_pair_check
  check ((time is null) = (end_time is null));

-- Remembers each entry's Google Calendar event ID once synced, so edits/deletes can be pushed
-- to the same event instead of duplicating it, and never-synced entries can be found later.
alter table important_dates add column if not exists google_event_id text;

create unique index if not exists profiles_one_admin_only on profiles (role) where role = 'admin';

create index if not exists tasks_objective_id_idx on tasks (objective_id);
create index if not exists tasks_scheduled_date_idx on tasks (scheduled_date);
create index if not exists tasks_completed_date_idx on tasks (completed_date);
create index if not exists tasks_status_idx on tasks (status);
create index if not exists messages_created_at_idx on messages (created_at);

-- ─────────────────────────────────────────────────────────────
-- Auto-create a blank profile row whenever someone signs up.
-- The app then walks them through "claiming" it (name/initials/color).
-- ─────────────────────────────────────────────────────────────

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', ''), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- Only the four of you can ever sign in (Supabase Auth), so once a
-- user is authenticated they get full read/write on shared data.
-- Anonymous (logged-out) access is blocked entirely.
-- ─────────────────────────────────────────────────────────────

alter table profiles enable row level security;
alter table objectives enable row level security;
alter table tasks enable row level security;
alter table task_assignees enable row level security;
alter table important_dates enable row level security;
alter table messages enable row level security;
alter table message_reads enable row level security;

create policy "profiles are readable by any signed-in user"
  on profiles for select
  to authenticated
  using (true);

create policy "a user can update only their own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "admin can update any profile"
  on profiles for update
  to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "objectives readable by signed-in users"
  on objectives for select
  to authenticated
  using (true);

create policy "only the admin can create objectives"
  on objectives for insert
  to authenticated
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "only the admin can delete objectives"
  on objectives for delete
  to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "only the admin can rename objectives"
  on objectives for update
  to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "tasks full access for signed-in users"
  on tasks for all
  to authenticated
  using (true)
  with check (true);

create policy "task_assignees full access for signed-in users"
  on task_assignees for all
  to authenticated
  using (true)
  with check (true);

create policy "important_dates full access for signed-in users"
  on important_dates for all
  to authenticated
  using (true)
  with check (true);

create policy "messages readable by signed-in users"
  on messages for select
  to authenticated
  using (true);

create policy "messages insert own"
  on messages for insert
  to authenticated
  with check (sender_id = auth.uid());

create policy "message_reads full access own"
  on message_reads for all
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- Realtime (so the daily list / board update live across the team)
-- ─────────────────────────────────────────────────────────────

alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table task_assignees;
alter publication supabase_realtime add table objectives;
alter publication supabase_realtime add table important_dates;
alter publication supabase_realtime add table messages;

-- ─────────────────────────────────────────────────────────────
-- Seed the three starting objectives
-- ─────────────────────────────────────────────────────────────

insert into objectives (title, position, hue) values
  ('Conduct validation conversations', 0, 250),
  ('Improve the model & develop our system', 1, 10),
  ('Build our first real MVP', 2, 130)
on conflict do nothing;
