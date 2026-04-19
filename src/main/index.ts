import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase } from './db'
import { registerAllHandlers } from './ipc'
import { collectionRepo } from './db/repos/collectionRepo'
import { syncLogRepo } from './db/repos/syncLogRepo'

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      webSecurity: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    mainWindow.webContents.openDevTools({ mode: 'detach' })

    mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
      console.error('did-fail-load', errorCode, errorDescription, validatedURL)
    })

    mainWindow.webContents.on('console-message', (_event, level, message) => {
      console.log(`[renderer][${level}]`, message)
    })

    // Notify renderer if database is empty so it can trigger initial import
    const collections = collectionRepo.findAll()
    if (collections.length === 0) {
      mainWindow.webContents.send('db-empty')
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    const rendererPath = join(__dirname, '../../dist/index.html')
    console.log('Loading renderer from:', rendererPath)
    mainWindow.loadFile(rendererPath)
  }

  return mainWindow
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.pokemon-tcg-manager')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  initDatabase()
  syncLogRepo.cleanupStaleRunning()

  const mainWindow = createWindow()
  registerAllHandlers(mainWindow)

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
