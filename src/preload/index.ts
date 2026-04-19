import { contextBridge, ipcRenderer } from 'electron'
import { ElectronAPI } from '../shared/types'

// Expose ElectronAPI to renderer via contextBridge
const api: ElectronAPI = {
  // Collections & Cards
  getCollections: () => ipcRenderer.invoke('getCollections'),
  getCards: (filter) => ipcRenderer.invoke('getCards', filter),
  getCardById: (id) => ipcRenderer.invoke('getCardById', id),

  // Purchases & Product Units
  createPurchase: (data) => ipcRenderer.invoke('createPurchase', data),
  getPurchases: () => ipcRenderer.invoke('getPurchases'),
  getPurchaseById: (id) => ipcRenderer.invoke('getPurchaseById', id),
  getProductUnit: (id) => ipcRenderer.invoke('getProductUnit', id),
  updateProductUnitStatus: (id, status) => ipcRenderer.invoke('updateProductUnitStatus', id, status),

  // User Collection
  getUserCollectionSummary: () => ipcRenderer.invoke('getUserCollectionSummary'),
  getUserCollectionCards: (collectionId) => ipcRenderer.invoke('getUserCollectionCards', collectionId),
  addCardToCollection: (entry) => ipcRenderer.invoke('addCardToCollection', entry),

  // Decks
  createDeck: (name) => ipcRenderer.invoke('createDeck', name),
  getDecks: () => ipcRenderer.invoke('getDecks'),
  getDeckById: (id) => ipcRenderer.invoke('getDeckById', id),
  updateDeck: (id, data) => ipcRenderer.invoke('updateDeck', id, data),
  deleteDeck: (id) => ipcRenderer.invoke('deleteDeck', id),

  // Trades
  createTrade: (data) => ipcRenderer.invoke('createTrade', data),
  getTrades: () => ipcRenderer.invoke('getTrades'),
  getTradeById: (id) => ipcRenderer.invoke('getTradeById', id),

  // Prices
  scrapeCollectionPrices: (collectionId) => ipcRenderer.invoke('scrapeCollectionPrices', collectionId),

  // Sync
  startInitialImport: () => ipcRenderer.invoke('startInitialImport'),
  startSync: () => ipcRenderer.invoke('startSync'),
  getSyncStatus: () => ipcRenderer.invoke('getSyncStatus'),
  onImportProgress: (cb) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: import('../shared/types').ImportProgress) => cb(progress)
    ipcRenderer.on('importProgress', listener)
    return () => ipcRenderer.removeListener('importProgress', listener)
  },
  onDbEmpty: (cb) => {
    const listener = () => cb()
    ipcRenderer.on('db-empty', listener)
    return () => ipcRenderer.removeListener('db-empty', listener)
  },
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in window for dev without contextIsolation)
  window.electron = api
}
