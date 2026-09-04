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

## One-time Google Calendar sync setup (optional)

Lets the Calendar screen push events to a shared "Amana Vision" Google Calendar — automatically as
they're created/edited/deleted from the app, plus a manual "catch up" button for anything that
failed to sync. Skip this section entirely and the app works fine without it: the sync button and
"not synced" badges only appear once both env vars below are set.

1. **Create a Google Cloud project** at [console.cloud.google.com](https://console.cloud.google.com)
   (any Google account works — it doesn't need to be a dedicated one).
2. **Enable the Google Calendar API** — APIs & Services → Library → search "Google Calendar API" →
   Enable.
3. **Configure the OAuth consent screen** — APIs & Services → OAuth consent screen. User type:
   External. Fill in an app name and support email. Under **Test users**, add the Google account
   email of everyone who'll use the sync (up to 100). Keeping the app in "Testing" publishing
   status is fine indefinitely for a small team — no Google review needed.
4. **Create an OAuth Client ID** — APIs & Services → Credentials → Create Credentials → OAuth
   client ID → Application type: **Web application**. Under "Authorized JavaScript origins," add:
   - `https://<your-github-username>.github.io` (your Pages URL's origin, no trailing path)
   - `http://localhost:5173` (for local dev)

   Save, then copy the **Client ID** (looks like `xxxxx.apps.googleusercontent.com`) — this is the
   `VITE_GOOGLE_CLIENT_ID` value. There's no client secret to manage for this flow.
5. **Create the shared calendar** — in your own Google Calendar (calendar.google.com), create a new
   calendar named "Amana Vision." Open its Settings → **"Share with specific people"** → add each
   teammate's Google email with **"Make changes to events"** permission.
6. **Get its Calendar ID** — that calendar's Settings page → **"Integrate calendar"** → copy the
   **Calendar ID** (looks like `xxxxx@group.calendar.google.com`) — this is the
   `VITE_GOOGLE_CALENDAR_ID` value.
7. **Set both env vars** — locally in `.env`, and as GitHub repo secrets (same place as the
   Supabase ones: Settings → Secrets and variables → Actions).

Once both are set, the sync button appears automatically — nothing else to configure. Each
teammate signs into Google the first time they trigger a sync (creating/editing/deleting an event,
or using the manual sync button); nothing is stored server-side, and access is controlled entirely
by step 5's calendar sharing.

## Environment variables

| Variable | Where it's used | Safe to expose? |
|---|---|---|
| `VITE_SUPABASE_URL` | frontend, GitHub Actions secret | Yes |
| `VITE_SUPABASE_ANON_KEY` | frontend, GitHub Actions secret | Yes (RLS enforces access) |
| `VITE_GOOGLE_CLIENT_ID` | frontend, GitHub Actions secret (optional) | Yes (public OAuth client) |
| `VITE_GOOGLE_CALENDAR_ID` | frontend, GitHub Actions secret (optional) | Yes (access is via sharing, not the ID) |

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
- `important_dates` — deadlines/milestones shown on the Calendar screen. `google_event_id` tracks
  whether/where each one was pushed to the shared Google Calendar (see setup section above).

## Progress tracker legend

- 0 points → red (no execution that day)
- 1–2 points → orange
- 3–4 points → yellow
- 5+ points → green
