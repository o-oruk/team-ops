/**
 * Hand-tuned objective colors. A single HSL formula looks muddy for some hues (yellows go olive,
 * greens go khaki), so each entry is a deep color picked by hand that reads well under white text.
 * `hue` is the color's real hue, used to map the hue stored on an objective to its nearest entry.
 */
const OBJECTIVE_PALETTE = [
  { hue: 0, vivid: '#DC2626' }, // red
  { hue: 21, vivid: '#EA580C' }, // orange
  { hue: 38, vivid: '#D97706' }, // amber
  { hue: 85, vivid: '#65A30D' }, // lime
  { hue: 142, vivid: '#16A34A' }, // green
  { hue: 175, vivid: '#0D9488' }, // teal
  { hue: 195, vivid: '#0891B2' }, // cyan
  { hue: 221, vivid: '#2563EB' }, // blue
  { hue: 243, vivid: '#4F46E5' }, // indigo
  { hue: 262, vivid: '#7C3AED' }, // violet
  { hue: 293, vivid: '#C026D3' }, // fuchsia
  { hue: 333, vivid: '#DB2777' }, // pink
]

function hueDistance(a: number, b: number) {
  const d = Math.abs(a - b) % 360
  return Math.min(d, 360 - d)
}

function paletteFor(hue: number) {
  return OBJECTIVE_PALETTE.reduce((best, c) => (hueDistance(c.hue, hue) < hueDistance(best.hue, hue) ? c : best))
}

/**
 * Picks the palette color farthest from every color already in use, so objectives added over time
 * stay as distinguishable as possible. Ties go to the earlier palette entry.
 */
export function nextDistinctHue(existingHues: number[]): number {
  const used = existingHues.map((h) => paletteFor(h).hue)
  if (used.length === 0) return OBJECTIVE_PALETTE[Math.floor(Math.random() * OBJECTIVE_PALETTE.length)].hue
  let best = OBJECTIVE_PALETTE[0].hue
  let bestDistance = -1
  for (const { hue } of OBJECTIVE_PALETTE) {
    const distance = Math.min(...used.map((u) => hueDistance(u, hue)))
    if (distance > bestDistance) {
      bestDistance = distance
      best = hue
    }
  }
  return best
}

export const vividHue = (hue: number) => paletteFor(hue).vivid

/** Every objective tab shows its full color; the selected one gets a ring in that color. */
export function objectiveTabStyle(hue: number, isActive: boolean) {
  const color = vividHue(hue)
  return {
    backgroundColor: color,
    color: 'white',
    boxShadow: isActive ? `0 0 0 2px white, 0 0 0 4px ${color}` : undefined,
  }
}

/** Hand-picked, fixed 8-color member palette. Each is meant to be used by at most one person at a time. */
export const MEMBER_PALETTE: string[] = [
  '#E11D2A', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#16A34A', // green
  '#2563EB', // blue
  '#9333EA', // violet
  '#8B5A2B', // brown
  '#1F2937', // black
]

/** Initials render in white by default; a couple of light swatches need a dark override for legibility. */
export const TEXT_COLOR_OVERRIDES: Record<string, string> = {
  '#EAB308': '#3D2E00',
}

/** Light swatches that need a darker shade when used as text on a white background. */
const ON_WHITE_OVERRIDES: Record<string, string> = {
  '#EAB308': '#A16207',
}

export function textOnWhite(color: string): string {
  return ON_WHITE_OVERRIDES[color.toUpperCase()] ?? color
}

export function textColorFor(background: string): string {
  return TEXT_COLOR_OVERRIDES[background.toUpperCase()] ?? 'white'
}
