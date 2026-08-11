import { describe, expect, it } from 'vitest'
import { buildPaletteCssVariables, parseColorIntegrationPalette } from './color-integration'

describe('parseColorIntegrationPalette', () => {
  it('parses a pywal colors.json object', () => {
    const palette = parseColorIntegrationPalette(
      JSON.stringify({
        special: {
          background: '#1e1e2e',
          foreground: '#cdd6f4',
          cursor: '#f5e0dc',
        },
        colors: {
          color0: '#1e1e2e',
          color1: '#f38ba8',
          color2: '#a6e3a1',
          color3: '#f9e2af',
          color4: '#89b4fa',
          color5: '#cba6f7',
          color6: '#94e2d5',
          color7: '#bac2de',
          color8: '#a6adc8',
          color9: '#f38ba8',
          color10: '#a6e3a1',
          color11: '#f9e2af',
          color12: '#89b4fa',
          color13: '#cba6f7',
          color14: '#94e2d5',
          color15: '#bac2de',
        },
      })
    )

    expect(palette).toEqual(
      expect.objectContaining({
        accent: '#cba6f7',
        accentGradient: ['#cba6f7', '#94e2d5'],
        background: '#1e1e2e',
        foreground: '#cdd6f4',
      })
    )
    expect(palette?.tokens.color0).toBe('#1e1e2e')
  })

  it('prefers an explicit accent token over color5', () => {
    const palette = parseColorIntegrationPalette(
      JSON.stringify({
        accent: '#ff0000',
        colors: { color5: '#00ff00' },
      })
    )
    expect(palette?.accent).toBe('#ff0000')
    expect(palette?.accentGradient[1]).toBe('#00ff00')
  })

  it('parses CSS custom properties from :root', () => {
    const palette = parseColorIntegrationPalette(`
      :root {
        --background: #11111b;
        --foreground: #cdd6f4;
        --color0: #11111b;
        --color5: #f5c2e7;
        --color6: #cba6f7;
      }
    `)
    expect(palette).toEqual(
      expect.objectContaining({
        accent: '#f5c2e7',
        accentGradient: ['#f5c2e7', '#cba6f7'],
        background: '#11111b',
        foreground: '#cdd6f4',
      })
    )
  })

  it('parses HTML files containing CSS variables', () => {
    const palette = parseColorIntegrationPalette(`
      <html>
        <head>
          <style>
            :root { --accent: #ff8800; --color6: #8800ff; }
          </style>
        </head>
      </html>
    `)
    expect(palette?.accent).toBe('#ff8800')
    expect(palette?.accentGradient).toEqual(['#ff8800', '#8800ff'])
  })

  it('parses a plain text file with one hex color per line', () => {
    const palette = parseColorIntegrationPalette('#11111b\n#f38ba8\n#a6e3a1\n#f9e2af\n#89b4fa\n#cba6f7\n#94e2d5')
    expect(palette?.accent).toBe('#cba6f7')
    expect(palette?.accentGradient).toEqual(['#cba6f7', '#94e2d5'])
  })

  it('returns null for empty or invalid content', () => {
    expect(parseColorIntegrationPalette('')).toBeNull()
    expect(parseColorIntegrationPalette('hello world')).toBeNull()
    expect(parseColorIntegrationPalette('not json {')).toBeNull()
    expect(parseColorIntegrationPalette('{"colors": {"color1": "not-a-color"}}')).toBeNull()
  })

  it('falls back to color9/color10 when color5 and color6 are absent', () => {
    const palette = parseColorIntegrationPalette('{"colors": {"color10": "#ff00aa", "color1": "#abcdef"}}')
    expect(palette?.accent).toBe('#ff00aa')
  })

  it('prefers color9 over color10', () => {
    const palette = parseColorIntegrationPalette('{"colors": {"color10": "#ff00aa", "color9": "#123456"}}')
    expect(palette?.accent).toBe('#123456')
  })

  it('normalizes bare hex values and extracts the nested colours dictionary', () => {
    const palette = parseColorIntegrationPalette(
      JSON.stringify({
        colours: {
          background: '15130e',
          text: 'f8f4e7',
          primary: 'd9c8a9',
          surfaceContainer: '2a2319',
          term0: '15130e',
          term1: 'e6b45e',
          term15: 'ffffff',
        },
      })
    )
    expect(palette?.tokens.background).toBe('#15130e')
    expect(palette?.tokens.text).toBe('#f8f4e7')
    expect(palette?.tokens.primary).toBe('#d9c8a9')
    expect(palette?.tokens.surfacecontainer).toBe('#2a2319')
    expect(palette?.accent).toBe('#d9c8a9')
    expect(palette?.accentGradient).toEqual(['#d9c8a9', '#d9c8a9'])
  })

  it('extracts colour values from the root object when no nested dictionary exists', () => {
    const palette = parseColorIntegrationPalette('{"background": "000000", "primary": "ff8800", "term15": "ffffff"}')
    expect(palette?.tokens.background).toBe('#000000')
    expect(palette?.accent).toBe('#ff8800')
    expect(palette?.tokens.term15).toBe('#ffffff')
  })

  it('extracts from the colors dictionary as well as colours', () => {
    const palette = parseColorIntegrationPalette(
      JSON.stringify({ colors: { background: '11111b', primary: 'ff00aa', text: 'cdd6f4' } })
    )
    expect(palette?.accent).toBe('#ff00aa')
    expect(palette?.tokens.background).toBe('#11111b')
    expect(palette?.tokens.text).toBe('#cdd6f4')
  })

  it('uses term colors as a fallback accent for theme files without primary', () => {
    const palette = parseColorIntegrationPalette(
      JSON.stringify({ colours: { term5: 'ff00aa', term6: '00aaff' } })
    )
    expect(palette?.accent).toBe('#ff00aa')
    expect(palette?.accentGradient).toEqual(['#ff00aa', '#00aaff'])
  })

  it('maps colour names to CSS custom properties for live theming', () => {
    const palette = parseColorIntegrationPalette(
      JSON.stringify({
        colours: {
          base: '15130e',
          text: 'f8f4e7',
          primary: 'd9c8a9',
          surface: '2a2319',
          term0: '15130e',
          term1: 'e6b45e',
          term7: '8aadf4',
        },
      })
    )
    expect(palette?.accent).toBe('#d9c8a9')
    expect(palette && buildPaletteCssVariables(palette.tokens)).toEqual({
      '--bg-primary': '#15130e',
      '--text-primary': '#f8f4e7',
      '--accent-color': '#d9c8a9',
      '--bg-secondary': '#2a2319',
      '--term0': '#15130e',
      '--term1': '#e6b45e',
      '--term7': '#8aadf4',
    })
  })

  it('supports onBackground and surfaceContainer aliases in the mapping', () => {
    expect(
      buildPaletteCssVariables({
        onbackground: '#ffffff',
        surfacecontainer: '#123456',
      })
    ).toEqual({
      '--text-primary': '#ffffff',
      '--bg-secondary': '#123456',
    })
  })
})
