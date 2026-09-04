import { GOOGLE_CLIENT_ID } from './googleConfig'

// Minimal shape of the bits of Google Identity Services (loaded as a global script — see
// index.html) that this file actually uses.
interface TokenResponse {
  access_token: string
  expires_in: number
  error?: string
}

interface TokenClientErrorResponse {
  type?: string
}

interface TokenClient {
  callback: (response: TokenResponse) => void
  error_callback?: (error: TokenClientErrorResponse) => void
  requestAccessToken: () => void
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

let tokenClient: TokenClient | null = null
let cachedToken: { token: string; expiresAt: number } | null = null

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

/**
 * Returns a Calendar-scoped Google access token, reusing a cached one when still valid.
 * The first call in a session prompts Google's own sign-in/account picker; Google Identity
 * Services re-uses that consent silently on later calls for as long as the session lasts.
 */
export async function getGoogleAccessToken(): Promise<string> {
  const clientId = GOOGLE_CLIENT_ID
  if (!clientId) {
    throw new Error('Google Calendar sync is not configured (missing VITE_GOOGLE_CLIENT_ID)')
  }
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token
  }

  await waitForGis()

  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      tokenClient = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/calendar.events',
        callback: () => {},
      })
    }
    tokenClient.callback = (response) => {
      if (response.error) {
        reject(new Error(response.error))
        return
      }
      cachedToken = { token: response.access_token, expiresAt: Date.now() + response.expires_in * 1000 }
      resolve(response.access_token)
    }
    tokenClient.error_callback = (err) => {
      reject(new Error(err?.type ?? 'Google sign-in failed'))
    }
    tokenClient.requestAccessToken()
  })
}
