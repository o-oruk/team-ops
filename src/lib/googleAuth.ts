import { CALENDAR_SCOPE, GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from './googleConfig'

/** A Google account the user has connected, as shown in the account picker. */
export interface GoogleAccount {
  email: string
  name: string | null
  picture: string | null
}

/** Thrown when a token can only be obtained by showing Google's UI, which needs a fresh click. */
export class NeedsSignInError extends Error {
  constructor(public email: string) {
    super(`Google sign-in needed for ${email}`)
    this.name = 'NeedsSignInError'
  }
}

// Minimal shape of the bits of Google Identity Services (loaded as a global script — see
// index.html) that this file actually uses.
interface TokenResponse {
  access_token: string
  expires_in: number
  scope?: string
  error?: string
}

interface TokenClientErrorResponse {
  type?: string
}

/** Per-call overrides GIS accepts on `requestAccessToken`. */
interface TokenRequestOverrides {
  prompt?: '' | 'none' | 'consent' | 'select_account'
  hint?: string
}

interface TokenClient {
  callback: (response: TokenResponse) => void
  error_callback?: (error: TokenClientErrorResponse) => void
  requestAccessToken: (overrides?: TokenRequestOverrides) => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: TokenResponse) => void
          }) => TokenClient
        }
      }
    }
  }
}

const ACCOUNTS_KEY = 'amana.googleAccounts'
const ACTIVE_ACCOUNT_KEY = 'amana.googleActiveAccount'

let tokenClient: TokenClient | null = null
/** Access tokens live for ~1h; caching them per account is what keeps repeat syncs click-free. */
const tokensByEmail = new Map<string, { token: string; expiresAt: number }>()

// ─────────────────────────────────────────────────────────────
// Remembered accounts (localStorage — nothing about Google is stored server-side)
// ─────────────────────────────────────────────────────────────

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private-mode / storage-blocked browsers just lose the "remembered accounts" convenience.
  }
}

export function listGoogleAccounts(): GoogleAccount[] {
  return readJSON<GoogleAccount[]>(ACCOUNTS_KEY, []).filter((a) => !!a?.email)
}

function rememberAccount(account: GoogleAccount): GoogleAccount[] {
  const others = listGoogleAccounts().filter((a) => a.email !== account.email)
  const next = [...others, account].sort((a, b) => a.email.localeCompare(b.email))
  writeJSON(ACCOUNTS_KEY, next)
  return next
}

export function forgetGoogleAccount(email: string): GoogleAccount[] {
  const next = listGoogleAccounts().filter((a) => a.email !== email)
  writeJSON(ACCOUNTS_KEY, next)
  tokensByEmail.delete(email)
  if (readActiveGoogleAccount() === email) writeActiveGoogleAccount(next[0]?.email ?? null)
  return next
}

export function readActiveGoogleAccount(): string | null {
  const email = readJSON<string | null>(ACTIVE_ACCOUNT_KEY, null)
  return email && listGoogleAccounts().some((a) => a.email === email) ? email : null
}

export function writeActiveGoogleAccount(email: string | null) {
  writeJSON(ACTIVE_ACCOUNT_KEY, email)
}

// ─────────────────────────────────────────────────────────────
// Tokens
// ─────────────────────────────────────────────────────────────

function waitForGis(timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    ;(function poll() {
      if (window.google?.accounts?.oauth2) {
        resolve()
        return
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error('Google sign-in script did not load in time'))
        return
      }
      setTimeout(poll, 100)
    })()
  })
}

async function requestToken(overrides: TokenRequestOverrides): Promise<TokenResponse> {
  const clientId = GOOGLE_CLIENT_ID
  if (!clientId) {
    throw new Error('Google Calendar sync is not configured (missing VITE_GOOGLE_CLIENT_ID)')
  }
  await waitForGis()

  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      tokenClient = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: GOOGLE_SCOPES,
        callback: () => {},
      })
    }
    tokenClient.callback = (response) => {
      if (response.error) reject(new Error(response.error))
      else resolve(response)
    }
    tokenClient.error_callback = (err) => {
      reject(new Error(err?.type ?? 'Google sign-in failed'))
    }
    tokenClient.requestAccessToken(overrides)
  })
}

/** Google lets people untick individual scopes on the consent screen — catch that early. */
function assertCalendarScope(granted: string | undefined) {
  if (granted && !granted.split(' ').includes(CALENDAR_SCOPE)) {
    throw new Error('Calendar access was not granted — tick the calendar permission and try again')
  }
}

async function fetchAccount(accessToken: string): Promise<GoogleAccount> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Could not read the Google account (${res.status})`)
  const data = await res.json()
  if (!data.email) throw new Error('Google did not return an email for this account')
  return { email: data.email as string, name: (data.name as string) ?? null, picture: (data.picture as string) ?? null }
}

/**
 * Runs one full token acquisition: ask GIS, confirm which account answered, cache the token.
 * `overrides.prompt: 'none'` makes it silent — it fails rather than showing any Google UI.
 */
async function acquire(overrides: TokenRequestOverrides): Promise<{ account: GoogleAccount; token: string }> {
  const response = await requestToken(overrides)
  assertCalendarScope(response.scope)
  const account = await fetchAccount(response.access_token)
  tokensByEmail.set(account.email, {
    token: response.access_token,
    expiresAt: Date.now() + response.expires_in * 1000,
  })
  rememberAccount(account)
  return { account, token: response.access_token }
}

/**
 * Opens Google's own account chooser so the user can add another of their Google accounts.
 * Must be called straight out of a click handler — it opens a popup.
 */
export async function connectGoogleAccount(): Promise<GoogleAccount> {
  const { account } = await acquire({ prompt: 'select_account' })
  return account
}

function cachedToken(email: string): string | null {
  const cached = tokensByEmail.get(email)
  return cached && cached.expiresAt > Date.now() + 60_000 ? cached.token : null
}

/**
 * Returns a Calendar-scoped token for one specific account.
 *
 * `interactive: false` never shows Google UI — it throws {@link NeedsSignInError} instead, so
 * background pushes (an edit, a delete) can quietly give up rather than ambushing the user with a
 * popup. `interactive: true` falls back to Google's chooser, so it needs a fresh user gesture.
 */
export async function getAccessTokenFor(email: string, { interactive }: { interactive: boolean }): Promise<string> {
  const cached = cachedToken(email)
  if (cached) return cached

  try {
    const { account, token } = await acquire({ prompt: 'none', hint: email })
    if (account.email === email) return token
  } catch {
    // Silent path is expected to fail when the grant has lapsed, or when the browser blocks the
    // hidden request (Safari/Firefox third-party cookie rules). Fall through to the loud path.
  }

  if (!interactive) throw new NeedsSignInError(email)

  const { account, token } = await acquire({ prompt: 'select_account', hint: email })
  if (account.email !== email) {
    throw new Error(`Signed in as ${account.email}, not ${email} — pick that account and try again`)
  }
  return token
}
