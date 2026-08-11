import { createTheme, type ThemeOptions } from '@mui/material/styles'
import {
  buildPaletteCssVariables,
  PALETTE_CSS_VARIABLES,
} from '@shared/color-integration'
import { getDefaultInterfaceColors, resolveInterfaceBrandColor } from '@shared/theme-colors'
import { useLayoutEffect, useMemo } from 'react'
import { useColorIntegrationPalette } from '@/stores/colorIntegrationStore'
import { settingsStore, useLanguage, useSettingsStore } from '@/stores/settingsStore'
import { uiStore, useUIStore } from '@/stores/uiStore'
import { type Language, Theme } from '../../shared/types'
import platform from '../platform'
import DesktopPlatform from '../platform/desktop_platform'

const ACCENT_CSS_VARIABLES = [
  '--chatbox-accent',
  '--chatbox-accent-gradient-start',
  '--chatbox-accent-gradient-end',
  '--chatbox-accent-gradient',
] as const

export const switchTheme = async (theme: Theme) => {
  let finalTheme = 'light' as 'light' | 'dark'
  if (theme === Theme.System) {
    finalTheme = (await platform.shouldUseDarkColors()) ? 'dark' : 'light'
  } else {
    finalTheme = theme === Theme.Dark ? 'dark' : 'light'
  }
  uiStore.setState({
    realTheme: finalTheme,
  })
  localStorage.setItem('initial-theme', finalTheme)
  if (platform instanceof DesktopPlatform) {
    await platform.switchTheme(finalTheme)
  }
}

export default function useAppTheme() {
  const theme = useSettingsStore((state) => state.theme)
  const interfaceColors = useSettingsStore((state) => state.interfaceColors ?? getDefaultInterfaceColors())
  const realTheme = useUIStore((state) => state.realTheme)
  const language = useLanguage()
  const colorIntegrationPalette = useColorIntegrationPalette()

  useLayoutEffect(() => {
    switchTheme(theme)
  }, [theme])

  useLayoutEffect(() => {
    platform.onSystemThemeChange(() => {
      const theme = settingsStore.getState().theme
      switchTheme(theme)
    })
  }, [])

  useLayoutEffect(() => {
    // update material-ui theme
    document.querySelector('html')?.setAttribute('data-theme', realTheme)
    // update tailwindcss theme
    if (realTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [realTheme])

  useLayoutEffect(() => {
    // Base light/dark surfaces always come from the active interface theme.
    // The dynamic palette (pywal etc.) only overrides the accent/gradient.
    const colors = interfaceColors[realTheme]
    const baseBrandColor = resolveInterfaceBrandColor(colors.brand, realTheme)
    const brandColor = colorIntegrationPalette?.accent ?? baseBrandColor
    const rootStyle = document.documentElement.style
    rootStyle.setProperty('--chatbox-background-primary', colors.backgroundPrimary)
    rootStyle.setProperty('--chatbox-background-secondary', colors.backgroundSecondary)
    rootStyle.setProperty('--chatbox-background-tertiary', colors.backgroundTertiary)
    rootStyle.setProperty('--chatbox-brand', brandColor)

    if (colorIntegrationPalette) {
      const [gradientStart, gradientEnd] = colorIntegrationPalette.accentGradient
      rootStyle.setProperty('--chatbox-accent', colorIntegrationPalette.accent)
      rootStyle.setProperty('--chatbox-accent-gradient-start', gradientStart)
      rootStyle.setProperty('--chatbox-accent-gradient-end', gradientEnd)
      rootStyle.setProperty('--chatbox-accent-gradient', `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`)
      // Dynamic theme JSON maps directly onto semantic CSS custom properties
      // (--bg-primary, --text-primary, --accent-color, --bg-secondary, --term0..15)
      // so the UI re-themes instantly when the palette file is loaded/changed.
      const paletteVariables = buildPaletteCssVariables(colorIntegrationPalette.tokens)
      for (const [cssVariable, value] of Object.entries(paletteVariables)) {
        rootStyle.setProperty(cssVariable, value)
      }
    } else {
      for (const variable of [...ACCENT_CSS_VARIABLES, ...PALETTE_CSS_VARIABLES]) {
        rootStyle.removeProperty(variable)
      }
    }
  }, [interfaceColors, realTheme, colorIntegrationPalette])

  const effectiveBrandColor = colorIntegrationPalette?.accent ?? interfaceColors[realTheme].brand
  const themeObj = useMemo(
    () =>
      createTheme(
        getThemeDesign(realTheme, language, resolveInterfaceBrandColor(effectiveBrandColor, realTheme))
      ),
    [interfaceColors, language, realTheme, effectiveBrandColor]
  )
  return themeObj
}

export function getThemeDesign(
  realTheme: 'light' | 'dark',
  language: Language,
  brandColor = getDefaultInterfaceColors()[realTheme].brand
): ThemeOptions {
  return {
    palette: {
      mode: realTheme,
      primary: {
        main: brandColor,
      },
      ...(realTheme === 'light'
        ? {}
        : {
            // MUI 内部无法处理 css 变量，需要使用具体颜色值
            background: {
              default: '#242424',
              paper: '#242424',
            },
          }),
    },
    components: {
      MuiSnackbarContent: {
        styleOverrides: {
          root: {
            backgroundColor: realTheme === 'dark' ? '#333333' : undefined,
            color: realTheme === 'dark' ? '#ffffff' : undefined,
          },
        },
      },
    },
    typography: {
      // In Chinese and Japanese the characters are usually larger,
      // so a smaller fontsize may be appropriate.
      ...(language === 'ar'
        ? {
            fontFamily: 'Cairo, Arial, sans-serif',
          }
        : {}),
      fontSize: 14,
    },
    direction: language === 'ar' ? 'rtl' : 'ltr',
    breakpoints: {
      values: {
        xs: 0,
        sm: 640, // 修改sm的值与tailwindcss保持一致
        md: 900,
        lg: 1200,
        xl: 1536,
      },
    },
  }
}
