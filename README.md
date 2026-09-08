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

## Google Calendar setup (optional)

Adds an **"Add to Google Calendar"** button to the Calendar screen. One press pushes every upcoming
entry into an **"Amana Vision"** calendar in whichever Google account you pick — the same way
Google's own "Work"/"Family" calendars keep things separable, so you can hide the whole lot with
one tick box in Google Calendar. Skip this section and the app works fine without it: the button
only appears once `VITE_GOOGLE_CLIENT_ID` is set.

1. **Create a Google Cloud project** at [console.cloud.google.com](https://console.cloud.google.com)
   (any Google account works — it doesn't need to be a dedicated one).
2. **Enable the Google Calendar API** — APIs & Services → Library → search "Google Calendar API" →
   Enable.
3. **Configure the OAuth consent screen** — APIs & Services → OAuth consent screen. User type:
   External. Fill in an app name and support email. Under **Scopes**, add
   `https://www.googleapis.com/auth/calendar` (create/manage calendars) plus `userinfo.email` and
   `userinfo.profile` (so the account picker can show which account you're adding to). Then click
   **Publish app** to move it out of "Testing" status.

   Publishing matters because "Testing" status only lets in Google accounts you've listed by email
   as test users — there's no way to hand your teammates a working link without first collecting
   everyone's Google address, defeating the point of letting each person pick their own account(s).
   Publishing removes that allowlist: anyone can sign in.

   The trade-off is that because calendar access is a "sensitive" scope and the app won't go
   through Google's verification review, each person sees an **"Google hasn't verified this app"**
   warning the first time they sign in. That's expected — it's not a security problem, just Google
   flagging that nobody paid for a review. Click **Advanced → Go to \<app name\> (unsafe)** to
   continue; it only asks once per Google account. No user cap applies to a small team like this.
4. **Create an OAuth Client ID** — APIs & Services → Credentials → Create Credentials → OAuth
   client ID → Application type: **Web application**. Under "Authorized JavaScript origins," add:
   - `https://<your-github-username>.github.io` (your Pages URL's origin, no trailing path)
   - `http://localhost:5173` (for local dev)

   Save, then copy the **Client ID** (looks like `xxxxx.apps.googleusercontent.com`) — this is the
   `VITE_GOOGLE_CLIENT_ID` value. There's no client secret to manage for this flow.
5. **Set the env var** — locally in `.env`, and as a GitHub repo secret (same place as the Supabase
   ones: Settings → Secrets and variables → Actions).

There is no calendar to create or share by hand. The first time someone syncs, the app looks for a
calendar named "Amana Vision" in the account they picked and creates one if it isn't there.

### How it behaves

- **The button.** Press it and every upcoming entry that isn't already on the chosen account's
  calendar goes across at once — in parallel, not one at a time — with a running count while it
  works.
- **Multiple Google accounts.** The caret next to the button opens the account picker. "Use another
  Google account" runs Google's own chooser; connected accounts are remembered in this browser and
  each keeps its own separate "already added" state. Nothing about your Google accounts is stored
  server-side beyond the account email attached to each sync record.
- **Never added twice.** Two independent guards. The dashboard records which entries have gone to
  which account (`google_calendar_links`), so a second press only pushes what's new. And the Google
  event ID is derived from the dashboard row's own ID, so even if that record were lost, Google
  itself rejects the duplicate rather than creating a second copy.
- **Edits and deletes** are mirrored onto copies already in Google, quietly and only when the
  browser still holds a valid Google token — nobody wants a sign-in popup for renaming an event. If
  an edit can't get through, that entry simply reappears in the button's count so the next press
  brings it back in line. A delete that can't get through leaves the Google copy behind; removing it
  from Google Calendar directly is the fix.

> **Upgrading from the old shared-calendar sync?** Entries pushed to the old shared
> `VITE_GOOGLE_CALENDAR_ID` calendar count as un-added under the new per-account model, so the first
> press will add them to your personal "Amana Vision" calendar. Delete the old shared calendar once
> everyone has moved over. The `VITE_GOOGLE_CALENDAR_ID` env var and secret are no longer read and
> can be removed.

## Environment variables

| Variable | Where it's used | Safe to expose? |
|---|---|---|
| `VITE_SUPABASE_URL` | frontend, GitHub Actions secret | Yes |
| `VITE_SUPABASE_ANON_KEY` | frontend, GitHub Actions secret | Yes (RLS enforces access) |
| `VITE_GOOGLE_CLIENT_ID` | frontend, GitHub Actions secret (optional) | Yes (public OAuth client) |

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
- `google_calendar_links` — one row per (user, entry, Google account) already added to Google
  Calendar. This is what stops the "Add to Google Calendar" button adding anything twice. Rows
  are private to the user who made them (RLS), unlike the shared tables above.

## Progress tracker legend

- 0 points → red (no execution that day)
- 1–2 points → orange
- 3–4 points → yellow
- 5+ points → green
