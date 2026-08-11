import fs from 'node:fs'
import path from 'node:path'
import { BrowserWindow, ipcMain } from 'electron'
import log from 'electron-log/main'

/**
 * Color Integration file watcher.
 *
 * The renderer asks the main process to watch an absolute path to a dynamic
 * palette file (pywal colors.json / .css / .html). Whenever the file changes
 * on disk the content is re-read and pushed to all windows so the theme can be
 * re-applied live without a restart.
 *
 * We watch the parent directory (rather than the file itself) because editors
 * and tools like pywal typically rewrite the file via a temp-file rename, which
 * `fs.watch` on a plain file often misses on Linux/macOS.
 */

const MAX_PALETTE_FILE_SIZE = 1024 * 1024 // 1MB

let watcher: fs.FSWatcher | null = null
let watchedPath: string | null = null
let debounceTimer: NodeJS.Timeout | null = null

async function readPaletteFile(filePath: string): Promise<{ content?: string; error?: string }> {
  try {
    const resolved = path.resolve(filePath)
    const stat = await fs.promises.stat(resolved)
    if (!stat.isFile()) {
      return { error: 'Path is not a file' }
    }
    if (stat.size > MAX_PALETTE_FILE_SIZE) {
      return { error: 'File is too large to use as a color palette' }
    }
    const content = await fs.promises.readFile(resolved, 'utf8')
    return { content }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

function broadcast(payload: { filePath: string; content?: string; error?: string }) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed() || win.webContents.isDestroyed()) {
      continue
    }
    win.webContents.send('color-integration:updated', payload)
  }
}

function refreshWatchedFile() {
  if (!watchedPath) {
    return
  }
  void readPaletteFile(watchedPath).then((result) => {
    if (!watchedPath) {
      return
    }
    broadcast({ filePath: watchedPath, ...result })
  })
}

function stopWatching() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (watcher) {
    watcher.close()
    watcher = null
  }
  watchedPath = null
}

export function registerColorIntegrationIpc() {
  ipcMain.handle('color-integration:watch', async (_event, filePath: unknown) => {
    if (typeof filePath !== 'string' || !filePath.trim()) {
      return { ok: false, error: 'Invalid file path' }
    }

    const resolved = path.resolve(filePath.trim())
    const stat = await fs.promises.stat(resolved).catch(() => null)
    if (!stat?.isFile()) {
      return { ok: false, error: 'File not found' }
    }

    stopWatching()
    watchedPath = resolved

    const dirPath = path.dirname(resolved)
    const basename = path.basename(resolved)
    try {
      watcher = fs.watch(dirPath, (_eventType, filename) => {
        // Filename may be null on some platforms (e.g. macOS directory events);
        // when provided, only react to the watched file itself.
        if (filename && filename !== basename) {
          return
        }
        if (debounceTimer) {
          clearTimeout(debounceTimer)
        }
        debounceTimer = setTimeout(refreshWatchedFile, 150)
      })
    } catch (error) {
      watchedPath = null
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }

    // Initial read so the palette applies immediately after enabling.
    refreshWatchedFile()
    log.info(`[ColorIntegration] watching palette file: ${resolved}`)
    return { ok: true }
  })

  ipcMain.handle('color-integration:unwatch', () => {
    stopWatching()
    return { ok: true }
  })
}
