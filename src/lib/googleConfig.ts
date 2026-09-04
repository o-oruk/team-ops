export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
export const GOOGLE_CALENDAR_ID = import.meta.env.VITE_GOOGLE_CALENDAR_ID as string | undefined

/** True once both the OAuth client and the shared "Amana Vision" calendar ID are configured. */
export function isGoogleSyncConfigured(): boolean {
  return !!GOOGLE_CLIENT_ID && !!GOOGLE_CALENDAR_ID
}
