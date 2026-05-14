// Main process
import { Event, inAppPurchase, Transaction } from 'electron'
import { metrics } from './metrics'
import { getMainWindow } from './deep-link'

// Every product ID we surface in App Store Connect. The two premium SKUs
// are auto-renewable subscriptions; the streak_freeze_xN SKUs are
// consumables. Suffixes mirror the Stripe lookup_keys exactly (premium_*
// and streak_freeze_*) so backend code can use the same identifier on
// both billing surfaces.
const PRODUCT_IDS = [
  'io.kochie.touch-typer.premium_monthly',
  'io.kochie.touch-typer.premium_yearly',
  'io.kochie.touch-typer.streak_freeze_x1',
  'io.kochie.touch-typer.streak_freeze_x3',
  'io.kochie.touch-typer.streak_freeze_x10',
]

export function setupInAppPurchase(): void {
  // inAppPurchase is macOS-only; skip on other platforms.
  if (process.platform !== 'darwin') {
    return
  }

  console.log("In-app purchase is available:", inAppPurchase.canMakePayments())

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
          console.log(`Purchasing ${product}...`)
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
          console.log(`${product} ${transaction.transactionState}: ${transaction.transactionIdentifier}`)
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
            console.warn('iap-transaction-purchased: no main window yet, deferring finish until renderer is up')
          }
          break
        }
        case 'failed':
          console.log(`Failed to purchase ${product}.`)
          metrics.count("iap.transaction", 1, { state: "failed", product })
          // Finish the transaction so StoreKit stops re-delivering it.
          inAppPurchase.finishTransactionByDate(transaction.transactionDate)
          break
        case 'deferred':
          console.log(`The purchase of ${product} has been deferred.`)
          metrics.count("iap.transaction", 1, { state: "deferred", product })
          break
        default:
          break
      }
    }
  })

  // Check if the user is allowed to make in-app purchase.
  if (!inAppPurchase.canMakePayments()) {
    console.log('The user is not allowed to make in-app purchase.')
  }
}

export async function getProducts(): Promise<Electron.Product[]> {

  if (process.mas) {
    console.log("This is a Mac App Store build");
    // Handle Mac App Store specific behavior here
  } else {
    console.log("This is a non-Mac App Store build");
    // Handle non-Mac App Store specific behavior here
  }

  const products = await inAppPurchase.getProducts(PRODUCT_IDS)

  console.log(products)
  return products
}
