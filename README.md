# Team Ops Dashboard

Internal execution tool for the team during the Sheraa validation sprint (through the Oct 15
pitch competition). Tracks the three main objectives, daily to-dos, and a progress tracker that
shows how consistently the team is executing. Built for four people — not a customer-facing
product.

**Stack:** Vite + React + TypeScript + Tailwind CSS, Supabase (Postgres + Auth), deployed to
GitHub Pages via GitHub Actions.

## Screens

- **Board** — the three objectives as tabs, each with its own task backlog.
- **Daily** — today's to-do list, a "Mine" and "Team" view of the same underlying tasks.
- **Progress** — a GitHub-style heatmap of daily execution, team-wide and per teammate.
- **Calendar** — important dates and scheduled tasks, chronologically.

## Run it locally

```bash
npm install
cp .env.example .env   # fill in your Supabase URL + anon key, see below
npm run dev
```

Open the printed `localhost` URL. You'll need a Supabase project set up first (next section).

## One-time Supabase setup (manual)

Supabase is the free hosted Postgres database + login system this app uses. Do this once:

1. **Create a Supabase account and project** at [supabase.com](https://supabase.com) (free tier).
   Pick any project name/region/database password (save the password somewhere safe, though the
   app itself won't need it directly).
2. **Run the schema.** In the Supabase dashboard, open the **SQL Editor**, paste the entire
   contents of [`supabase/schema.sql`](./supabase/schema.sql), and click **Run**. This creates all
   four tables, security rules, and seeds the three starting objectives.
3. **Get your API keys.** In the dashboard, go to **Settings → API**. Copy the **Project URL** and
   the **anon / public key**.
4. **Set your local `.env`.** Paste those two values into `.env` (copied from `.env.example`):
   ```
   VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
5. **Add the same two values as GitHub repo secrets** (Settings → Secrets and variables → Actions
   → New repository secret): `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. This lets the
   deploy workflow build the site with your credentials without ever committing them.
6. **Enable GitHub Pages** — repo Settings → Pages → Source: **GitHub Actions**.
7. **Enable email confirmations off (optional, for a 4-person tool)** — Authentication → Providers
   → Email → you can leave "Confirm email" on for security, or turn it off so teammates can log in
   immediately after signing up. Either works.
8. **Invite your teammates** — once the site is deployed (see below), just send them the URL. Each
   person signs up with their own email + password, then claims a profile (name, initials, color)
   on first login. No invite links needed since anyone can self-register — the app itself is only
   useful to people who know the four of you agreed to use it.

The Supabase **anon key is meant to be public** — it's safe to ship in the frontend bundle because
Row Level Security (enabled by the schema script) restricts what it can actually do. Never commit
or expose your Supabase **service-role key** (you won't need it for this app).

## Adding an entry to Google Calendar

Every entry on the Calendar screen has a small Google Calendar icon next to its Edit/Delete
buttons. Clicking it opens `calendar.google.com` in a new tab, pre-filled with that entry's title,
date/time, and note — pick whichever Google account you want in Google's own account switcher, and
click Save.

No setup, no OAuth client, no consent screen, nothing stored — it's just a link, so it works out of
the box for everyone. The trade-off is that Google's link format has no parameter for event color,
so the meeting/event/deadline color coding only exists on the dashboard; on Google Calendar, set it
by hand with one click on the event's color swatch if you want it there too.

(`google_calendar_links` in the schema is unused leftover from an earlier bulk-sync version of this
feature — harmless to leave, or drop the table if you'd rather clean it up.)

## Task-assignment emails (optional)

Emails a teammate when they're assigned a task (at creation, or via the assignee picker on an
existing task). Skip this section and the app works fine without it — a failed or unconfigured
send never blocks assigning the task, it just silently doesn't email anyone.

This needs a real mail-sending backend — a browser app can't send email directly without shipping
credentials in the page for anyone to steal — so it runs as a Supabase Edge Function
(`supabase/functions/notify-task-assigned`) that sends via Gmail SMTP.

1. **Turn on 2-Step Verification** on the sending Google account (myaccount.google.com/security),
   if it isn't already on — required before Google will issue an App Password.
2. **Create an App Password** — myaccount.google.com/apppasswords → name it anything (e.g. "Amana
   Vision dashboard") → copy the 16-character password it generates. This is *not* the account's
   normal login password, and it's the only credential this feature needs — no OAuth, no consent
   screen.
3. **Deploy the function** — in the Supabase dashboard, **Edge Functions** → **Deploy a new
   function** → **Via Editor**, name it `notify-task-assigned`, and paste in the contents of
   `supabase/functions/notify-task-assigned/index.ts` from this repo. Leave JWT verification
   **on** (the default) — that's what restricts calls to signed-in dashboard users.
4. **Set its secrets** — same Edge Functions page → **Secrets** → add:

   | Secret | Value |
   |---|---|
   | `SMTP_HOSTNAME` | `smtp.gmail.com` |
   | `SMTP_PORT` | `465` |
   | `SMTP_SECURE` | `true` |
   | `SMTP_USERNAME` | the sending Gmail address |
   | `SMTP_PASSWORD` | the App Password from step 2 |
   | `SMTP_FROM` | e.g. `Amana Vision <that-same-address@gmail.com>` |

   (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, which the function uses to look up the task and
   assignees' emails, are provided automatically — nothing to set for those.)
5. Redeploy the function if you edited it after the first deploy (**Deploy updates**).

That's it — no client-side env var, nothing in `.env`. Try it by assigning a task to someone on the
Board screen.

## Environment variables

| Variable | Where it's used | Safe to expose? |
|---|---|---|
| `VITE_SUPABASE_URL` | frontend, GitHub Actions secret | Yes |
| `VITE_SUPABASE_ANON_KEY` | frontend, GitHub Actions secret | Yes (RLS enforces access) |

## Deploying

Push to `main` — the `.github/workflows/deploy.yml` workflow builds the app and publishes it to
GitHub Pages automatically. First-time setup: make sure Pages is set to deploy from **GitHub
Actions** (Settings → Pages) and that the two secrets above are set (Settings → Secrets and
variables → Actions).

Because this repo is public on a free GitHub account (required for free Pages hosting), **do not
commit any `.env` file or secret**. Only the Supabase URL and anon key are ever present, and only
in GitHub Actions secrets / your local `.env` — both are safe to expose by design.

## Data model

See [`supabase/schema.sql`](./supabase/schema.sql) for the full schema. Summary:

- `profiles` — one row per teammate (name, initials, color, role), auto-created on signup, claimed
  on first login.
- `objectives` — the roadmap tabs.
- `tasks` — every task, with weight (1/2/3), assignee, status (`backlog` / `daily` / `done`), and
  completion info. A day's points = sum of weights of tasks with that `completed_date`. There is
  no separate points table — everything on the Progress screen is derived live from this table.
- `important_dates` — deadlines/milestones shown on the Calendar screen.
- `google_calendar_links` — unused; see the note in "Adding an entry to Google Calendar" above.

## Progress tracker legend

- 0 points → red (no execution that day)
- 1–2 points → orange
- 3–4 points → yellow
- 5+ points → green
