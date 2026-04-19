import { BrowserWindow } from 'electron'
import { registerCollectionsHandlers } from './collectionsHandler'
import { registerPurchasesHandlers } from './purchasesHandler'
import { registerUserCollectionHandlers } from './userCollectionHandler'
import { registerDecksHandlers } from './decksHandler'
import { registerTradesHandlers } from './tradesHandler'
import { registerSyncHandlers } from './syncHandler'
import { registerScrapeHandlers } from './scrapeHandler'

export function registerAllHandlers(win: BrowserWindow): void {
  registerCollectionsHandlers()
  registerPurchasesHandlers()
  registerUserCollectionHandlers()
  registerDecksHandlers()
  registerTradesHandlers()
  registerSyncHandlers(win)
  registerScrapeHandlers()
}
