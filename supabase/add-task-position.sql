-- One-time migration (2026-10-16): lets tasks due the same day be dragged into a custom order on
-- the Roadmap. Safe to run more than once. Paste into the Supabase SQL Editor and click Run.

alter table tasks add column if not exists position int;
