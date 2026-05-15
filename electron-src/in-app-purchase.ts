// Main process
import { Event, inAppPurchase, Transaction } from 'electron'
import log from 'electron-log'
import { metrics } from './metrics'
import { getMainWindow } from './deep-link'

// Every product ID we surface in App Store Connect. The two premium SKUs
// are auto-renewable subscriptions; the streak_freeze_xN SKUs are
// consumables. Suffixes mirror the Stripe lookup_keys exactly (premium_*
// and streak_freeze_*) so backend code can use the same identifier on
// both billing surfaces.
const PRODUCT_IDS = [
  'premium_monthly',
  'premium_yearly',
  'streak_freeze_x1',
  'streak_freeze_x3',
  'streak_freeze_x10',
]

export function setupInAppPurchase(): void {
  // inAppPurchase is macOS-only; skip on other platforms.
  if (process.platform !== 'darwin') {
    return
  }

  log.info("[IAP] setupInAppPurchase: canMakePayments=", inAppPurchase.canMakePayments(), "process.mas=", process.mas)

  // Listen for transactions as soon as possible.
  inAppPurchase.on('transactions-updated', (_event: Event, transactions: Transaction[]) => {
    if (!Array.isArray(transactions)) {
      return
    }

    // Check each transaction.
    for (const transaction of transactions) {
      const payment = transaction.payment

      const product = payment.productIdentifier;
      switch (transaction.transactionState) {
        case 'purchasing':
          log.info(`[IAP] Purchasing ${product}...`)
          metrics.count("iap.transaction", 1, { state: "purchasing", product })
          break
        case 'purchased':
        case 'restored': {
          // 'purchased' = brand-new transaction StoreKit just completed.
          // 'restored' = a prior transaction StoreKit is re-delivering
          // because the user clicked Restore Purchases. Both follow the
          // same flow: forward to the renderer so it can register the
          // (user_id, transaction_id, product_id) tuple via the
          // map-transaction edge function. The renderer then calls
          // `finish-iap-transaction` IPC to finalize. Until that round
          // trip completes, StoreKit will keep re-delivering on every
          // app launch (at-least-once), so a crash between purchase
          // and finish is recoverable.
          log.info(`[IAP] ${product} ${transaction.transactionState}: ${transaction.transactionIdentifier}`)
          metrics.count("iap.transaction", 1, { state: transaction.transactionState, product })
          const win = getMainWindow()
          if (win && !win.isDestroyed()) {
            win.webContents.send('iap-transaction-purchased', {
              transactionId: transaction.transactionIdentifier,
              originalTransactionId: transaction.originalTransactionIdentifier ?? transaction.transactionIdentifier,
              productId: product,
              transactionDate: transaction.transactionDate,
              state: transaction.transactionState,
            })
          } else {
            // No window yet (e.g. transaction queued before launch finishes).
            // StoreKit will redeliver this on the next 'transactions-updated'
            // event after the window opens, so we just defer.
            log.warn('[IAP] iap-transaction-purchased: no main window yet, deferring finish until renderer is up')
          }
          break
        }
        case 'failed': {
          // 'failed' transactions DO surface a StoreKit error code/message —
          // log them so sandbox debugging isn't a guessing game.
          const errorCode = (transaction as unknown as { errorCode?: number }).errorCode
          const errorMessage = (transaction as unknown as { errorMessage?: string }).errorMessage
          log.error(`[IAP] Failed to purchase ${product}. errorCode=${errorCode} errorMessage=${errorMessage}`)
          metrics.count("iap.transaction", 1, { state: "failed", product })
          // Finish the transaction so StoreKit stops re-delivering it.
          inAppPurchase.finishTransactionByDate(transaction.transactionDate)
          break
        }
        case 'deferred':
          log.info(`[IAP] The purchase of ${product} has been deferred.`)
          metrics.count("iap.transaction", 1, { state: "deferred", product })
          break
        default:
          break
      }
    }
  })

  // Check if the user is allowed to make in-app purchase.
  if (!inAppPurchase.canMakePayments()) {
    log.warn('[IAP] User is not allowed to make in-app purchases (canMakePayments=false)')
  }

  // One-shot startup probe: try to fetch product metadata from StoreKit.
  // This is the cleanest single signal for "is App Store Connect set up
  // correctly for this bundle ID on the current storefront". A zero-length
  // response is the smoking gun for sandbox debugging.
  void getProducts().catch((err) => log.error('[IAP] startup getProducts failed', err))
}

export async function getProducts(): Promise<Electron.Product[]> {
  log.info(`[IAP] getProducts called (process.mas=${process.mas}, ids=${PRODUCT_IDS.length})`)
  try {
    const products = await inAppPurchase.getProducts(PRODUCT_IDS)
    if (products.length === 0) {
      log.error('[IAP] getProducts returned 0 products. Check App Store Connect: product IDs must exist with status "Ready to Submit" or higher, parent app bundle ID must match io.kochie.touch-typer, and a Sandbox Apple ID must be signed in via System Settings → Apple Account → Media & Purchases → Sandbox Account.')
    } else {
      log.info(`[IAP] getProducts returned ${products.length} products: ${products.map(p => p.productIdentifier).join(', ')}`)
    }
    return products
  } catch (err) {
    log.error('[IAP] getProducts threw:', err)
    throw err
  }
}
