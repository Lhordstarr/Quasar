import type { ColorIntegrationPalette } from '@shared/color-integration'
import { createStore, useStore } from 'zustand'

export type ColorIntegrationStatus = 'idle' | 'watching' | 'error'

interface ColorIntegrationState {
  /** Parsed palette currently applied as an overlay over the base theme. */
  palette: ColorIntegrationPalette | null
  status: ColorIntegrationStatus
  filePath: string
  error: string | null
  lastUpdatedAt: number | null
  apply: (palette: ColorIntegrationPalette, filePath: string) => void
  setError: (error: string) => void
  clear: () => void
}

export const colorIntegrationStore = createStore<ColorIntegrationState>()((set) => ({
  palette: null,
  status: 'idle',
  filePath: '',
  error: null,
  lastUpdatedAt: null,
  apply: (palette, filePath) => set({ palette, status: 'watching', filePath, error: null, lastUpdatedAt: Date.now() }),
  // Keep the last good palette on transient read errors (e.g. a tool rewriting
  // the file via rename) so the UI does not flicker back to the base theme.
  setError: (error) => set(() => ({ status: 'error', error })),
  clear: () => set({ palette: null, status: 'idle', filePath: '', error: null, lastUpdatedAt: null }),
}))

export function useColorIntegrationStore<U>(selector: (state: ColorIntegrationState) => U): U {
  return useStore(colorIntegrationStore, selector)
}

export const useColorIntegrationPalette = () => useColorIntegrationStore((state) => state.palette)
