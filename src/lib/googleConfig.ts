export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

/**
 * Every dashboard event is filed under a calendar with this name, the same way Google's own
 * "Work"/"Family" calendars separate things. It's created on demand in whichever Google account
 * the user picks, so each account ends up with its own "Amana Vision" calendar.
 */
export const AMANA_CALENDAR_NAME = 'Amana Vision'
export const AMANA_CALENDAR_DESCRIPTION = 'Events synced from the Amana Vision team dashboard.'
/** Colour Google shows the calendar in — matches the dashboard accent. Cosmetic only. */
export const AMANA_CALENDAR_COLOR = '#4f46e5'

/** Covers creating the "Amana Vision" calendar as well as writing events into it. */
export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar'

/** Email/profile are what let the account picker show *which* account you're adding to. */
export const GOOGLE_SCOPES = [
  CALENDAR_SCOPE,
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ')

/** True once the OAuth client is configured; the calendar itself needs no configuration. */
export function isGoogleSyncConfigured(): boolean {
  return !!GOOGLE_CLIENT_ID
}
