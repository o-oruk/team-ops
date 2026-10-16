-- One-time migration (2026-10-16): the Sheraa validation sprint is over and the dashboard now runs
-- ongoing company operations. Creates the sprints table, then archives every objective that
-- existed before today (and, through objective_id, all their tasks) into the finished sprint.
-- Safe to run more than once. Paste into the Supabase SQL Editor and click Run.

create table if not exists sprints (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now()
);

alter table objectives add column if not exists sprint_id uuid references sprints (id) on delete set null;

alter table sprints enable row level security;

drop policy if exists "sprints readable by signed-in users" on sprints;
create policy "sprints readable by signed-in users"
  on sprints for select
  to authenticated
  using (true);

drop policy if exists "only the admin can manage sprints" on sprints;
create policy "only the admin can manage sprints"
  on sprints for all
  to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

do $$
begin
  alter publication supabase_realtime add table sprints;
exception when duplicate_object then null;
end $$;

insert into sprints (name, start_date, end_date)
select 'Sheraa validation sprint', '2026-08-17', '2026-10-15'
where not exists (select 1 from sprints where name = 'Sheraa validation sprint');

update objectives
  set sprint_id = (select id from sprints where name = 'Sheraa validation sprint')
  where sprint_id is null and created_at < '2026-10-16';
