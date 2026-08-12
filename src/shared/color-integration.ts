// Color Integration: parses external dynamic palette files (e.g. pywal output or
// dynamic theme JSON) into accent / gradient overlay tokens that sit on top of
// the active base light/dark theme. Supports:
//   - pywal colors.json   ({ "special": {background, foreground}, "colors": { color0..color15 } })
//   - dynamic theme JSON  (colour values on the root object or under `colours`/`colors`:
//                          background, base, text, onBackground, primary,
//                          surfaceContainer, surface, term0..term15)
//   - CSS / HTML files    (:root { --accent: #hex; --color5: #hex; ... })
//   - plain text files    (one hex color per line, e.g. pywal `colors`)
//
// This module is shared and side-effect free so it can be unit tested and used
// from both the renderer and any future non-desktop consumer. Live application
// of the parsed tokens to the DOM happens in the renderer.

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
const BARE_HEX_RE = /^(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR_RE.test(value.trim())
}

/**
 * Normalizes a color value into a `#rrggbb`-style hex string. Values that
 * already start with `#` are returned as-is; bare hex strings (e.g. "15130e")
 * get a leading `#` prepended. Returns null when the value is not a hex color.
 */
export function normalizeHex(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  if (isHexColor(trimmed)) {
    return trimmed
  }
  if (BARE_HEX_RE.test(trimmed)) {
    return `#${trimmed}`
  }
  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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
    tokens.primary ||
    tokens.color5 ||
    tokens.term5 ||
    tokens.color6 ||
    tokens.term6 ||
    tokens.color4 ||
    tokens.color9 ||
    tokens.color10 ||
    tokens.color1
  return isHexColor(candidate) ? candidate : null
}

function resolveGradientEnd(tokens: Record<string, string>, accent: string): string | null {
  const candidate = tokens.color6 || tokens.term6 || tokens.color7 || tokens.term7 || tokens.color5 || accent
  return isHexColor(candidate) ? candidate : null
}

/**
 * CSS custom properties produced by {@link buildPaletteCssVariables}. Used by
 * the renderer to clean up previously applied values when the palette clears.
 */
export const PALETTE_CSS_VARIABLES: ReadonlyArray<string> = [
  '--bg-primary',
  '--bg-surface',
  '--bg-secondary',
  '--card-bg',
  '--text-primary',
  '--accent-color',
  ...Array.from({ length: 16 }, (_, index) => `--term${index}`),
]

const SEMANTIC_CSS_VARIABLE_MAPPING: ReadonlyArray<readonly [string, ReadonlyArray<string>]> = [
  // Primary window background tint: exact base colour of the theme file.
  ['--bg-primary', ['background', 'base', 'surface']],
  ['--text-primary', ['text', 'onbackground']],
  ['--accent-color', ['primary']],
  // Surface / card tone for panels and containers.
  ['--bg-secondary', ['surfacecontainer', 'surfacevariant']],
]

/**
 * Maps a parsed palette's tokens onto the CSS custom properties described by
 * the dynamic theme JSON mapping, e.g. `colours.background` -> `--bg-primary`,
 * `colours.surfaceContainer` -> `--bg-secondary` / `--card-bg`, and
 * `colours.term0`..`term15` -> `--term0`..`--term15`. Pure and side-effect
 * free; the renderer applies the result to `document.documentElement.style`.
 */
export function buildPaletteCssVariables(tokens: Record<string, string>): Record<string, string> {
  const variables: Record<string, string> = {}
  for (const [cssVariable, sourceKeys] of SEMANTIC_CSS_VARIABLE_MAPPING) {
    for (const sourceKey of sourceKeys) {
      const normalized = normalizeHex(tokens[sourceKey])
      if (normalized) {
        variables[cssVariable] = normalized
        break
      }
    }
  }
  const secondary = variables['--bg-secondary']
  if (secondary) {
    variables['--bg-surface'] = secondary
    variables['--card-bg'] = secondary
  }
  for (let index = 0; index <= 15; index += 1) {
    const normalized = normalizeHex(tokens[`term${index}`])
    if (normalized) {
      variables[`--term${index}`] = normalized
    }
  }
  return variables
}

export function parseColorIntegrationPalette(content: string): ColorIntegrationPalette | null {
  const text = (content || '').trim()
  if (!text) {
    return null
  }

  let tokens: Record<string, string> = {}

  if (text.startsWith('{')) {
    try {
      const data: unknown = JSON.parse(text)
      if (isRecord(data)) {
        // Gather every colour dictionary, later entries win: the root object
        // itself (flat theme files), pywal's `special`, then the nested
        // `colours` / `colors` dictionaries. Non-colour keys are ignored.
        const colourDicts: Array<Record<string, unknown>> = [data]
        if (isRecord(data.special)) {
          colourDicts.push(data.special)
        }
        if (isRecord(data.colours)) {
          colourDicts.push(data.colours)
        }
        if (isRecord(data.colors)) {
          colourDicts.push(data.colors)
        }
        for (const dict of colourDicts) {
          for (const [key, value] of Object.entries(dict)) {
            const normalized = normalizeHex(value)
            if (normalized) {
              tokens[key.toLowerCase()] = normalized
            }
          }
        }
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

  const resolvedBackground = tokens.background || null
  const resolvedForeground = tokens.foreground || null

  return {
    accent,
    accentGradient: [accent, gradientEnd],
    background: isHexColor(resolvedBackground) ? resolvedBackground : null,
    foreground: isHexColor(resolvedForeground) ? resolvedForeground : null,
    tokens,
  }
}
