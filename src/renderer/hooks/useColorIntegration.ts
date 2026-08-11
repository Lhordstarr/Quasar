import { parseColorIntegrationPalette } from '@shared/color-integration'
import { useEffect } from 'react'
import platform from '@/platform'
import { colorIntegrationStore, useColorIntegrationStore } from '@/stores/colorIntegrationStore'
import { useSettingsStore } from '@/stores/settingsStore'

const DESKTOP_ONLY_ERROR = 'Color integration requires the desktop app.'

/**
 * Watches the configured dynamic palette file on disk and streams its parsed
 * accent/gradient tokens into the color integration store. The actual CSS
 * overlay is applied by useAppTheme so it stays coordinated with the base
 * light/dark theme.
 */
export function useColorIntegration() {
  const colorIntegrationPath = useSettingsStore((state) => state.colorIntegrationPath)

  useEffect(() => {
    const trimmedPath = colorIntegrationPath?.trim()

    if (!trimmedPath) {
      colorIntegrationStore.getState().clear()
      return
    }

    if (platform.type !== 'desktop' || !platform.watchColorIntegrationFile || !platform.onColorIntegrationUpdate) {
      colorIntegrationStore.getState().setError(DESKTOP_ONLY_ERROR)
      return
    }

    let disposed = false

    const unsubscribe = platform.onColorIntegrationUpdate((payload) => {
      if (disposed) {
        return
      }
      if (payload.error) {
        colorIntegrationStore.getState().setError(payload.error)
        return
      }
      if (typeof payload.content !== 'string') {
        return
      }
      const palette = parseColorIntegrationPalette(payload.content)
      if (!palette) {
        colorIntegrationStore.getState().setError('No colors found in the selected file.')
        return
      }
      colorIntegrationStore.getState().apply(palette, payload.filePath)
    })

    platform
      .watchColorIntegrationFile(trimmedPath)
      .then((result) => {
        if (disposed) {
          return
        }
        if (!result.ok) {
          colorIntegrationStore.getState().setError(result.error || 'Failed to watch the palette file.')
        }
      })
      .catch(() => {
        if (!disposed) {
          colorIntegrationStore.getState().setError('Failed to watch the palette file.')
        }
      })

    return () => {
      disposed = true
      unsubscribe()
      void platform.stopColorIntegrationFile?.()
    }
  }, [colorIntegrationPath])

  return useColorIntegrationStore((state) => state)
}
