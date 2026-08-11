// Color Integration: parses external dynamic palette files (e.g. pywal output)
// into accent / gradient overlay tokens that sit on top of the active base
// light/dark theme. Supports:
//   - pywal colors.json   ({ "special": {background, foreground}, "colors": { color0..color15 } })
//   - CSS / HTML files    (:root { --accent: #hex; --color5: #hex; ... })
//   - plain text files    (one hex color per line, e.g. pywal `colors`)
//
// This module is shared and side-effect free so it can be unit tested and used
// from both the renderer and any future non-desktop consumer.

export interface ColorIntegrationPalette {
  /** Primary accent color, used to recolor brand controls and links. */
  accent: string
  /** Two-stop gradient derived from the palette accent. */
  accentGradient: [string, string]
  /** Optional background token from the palette (not applied to base theme). */
  background: string | null
  /** Optional foreground token from the palette. */
  foreground: string | null
  /** All extracted color tokens, keyed without the leading `--`. */
  tokens: Record<string, string>
}

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR_RE.test(value.trim())
}

const CSS_VAR_RE = /(--[a-zA-Z0-9-]+)\s*:\s*([^;}\n]+);?/g

function extractCssVariables(text: string): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const match of text.matchAll(CSS_VAR_RE)) {
    const key = match[1].replace(/^--/, '').toLowerCase()
    const value = match[2].trim()
    if (isHexColor(value)) {
      vars[key] = value
    }
  }
  return vars
}

function resolveAccent(tokens: Record<string, string>): string | null {
  const candidate =
    tokens.accent ||
    tokens.color5 ||
    tokens.color6 ||
    tokens.color4 ||
    tokens.color9 ||
    tokens.color10 ||
    tokens.color1
  return isHexColor(candidate) ? candidate : null
}

function resolveGradientEnd(tokens: Record<string, string>, accent: string): string | null {
  const candidate = tokens.color6 || tokens.color7 || tokens.color5 || accent
  return isHexColor(candidate) ? candidate : null
}

export function parseColorIntegrationPalette(content: string): ColorIntegrationPalette | null {
  const text = (content || '').trim()
  if (!text) {
    return null
  }

  let tokens: Record<string, string> = {}
  let background: string | null = null
  let foreground: string | null = null

  if (text.startsWith('{')) {
    try {
      const data: unknown = JSON.parse(text)
      if (data && typeof data === 'object') {
        const record = data as {
          colors?: Record<string, unknown>
          accent?: unknown
          special?: { background?: unknown; foreground?: unknown; accent?: unknown }
          background?: unknown
          foreground?: unknown
        }
        if (record.colors && typeof record.colors === 'object') {
          for (const [key, value] of Object.entries(record.colors)) {
            if (isHexColor(value)) {
              tokens[key.toLowerCase()] = value
            }
          }
        }
        if (isHexColor(record.special?.background)) background = record.special.background
        if (isHexColor(record.special?.foreground)) foreground = record.special.foreground
        if (isHexColor(record.special?.accent)) tokens.accent = record.special.accent
        if (isHexColor(record.accent)) tokens.accent = record.accent
        if (isHexColor(record.background)) background = record.background
        if (isHexColor(record.foreground)) foreground = record.foreground
      }
    } catch {
      return null
    }
  } else {
    tokens = extractCssVariables(text)
    if (Object.keys(tokens).length === 0) {
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => isHexColor(line))
      lines.forEach((color, index) => {
        tokens[`color${index}`] = color
      })
    }
  }

  if (Object.keys(tokens).length === 0) {
    return null
  }

  const accent = resolveAccent(tokens)
  if (!accent) {
    return null
  }
  const gradientEnd = resolveGradientEnd(tokens, accent)
  if (!gradientEnd) {
    return null
  }

  const resolvedBackground = background || tokens.background || null
  const resolvedForeground = foreground || tokens.foreground || null

  return {
    accent,
    accentGradient: [accent, gradientEnd],
    background: isHexColor(resolvedBackground) ? resolvedBackground : null,
    foreground: isHexColor(resolvedForeground) ? resolvedForeground : null,
    tokens,
  }
}
