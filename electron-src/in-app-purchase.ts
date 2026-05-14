// Main process
import { Event, inAppPurchase, Transaction } from 'electron'
import { metrics } from './metrics'

// Only consumable streak-freeze packs are live in App Store Connect today.
// Auto-renewable subscription products (premium monthly/yearly) are NOT
// available on MAS yet — premium upgrade for MAS users currently routes
// through the website Stripe flow.
const PRODUCT_IDS = [
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
        case 'purchased': {
          console.log(`${product} purchased.`)
          metrics.count("iap.transaction", 1, { state: "purchased", product })
          // Get the receipt url.
          const receiptURL = inAppPurchase.getReceiptURL()
          console.log(`Receipt URL: ${receiptURL}`)

          // Submit the receipt file to the server and check if it is valid.
          // @see https://developer.apple.com/library/content/releasenotes/General/ValidateAppStoreReceipt/Chapters/ValidateRemotely.html
          // ...
          // If the receipt is valid, the product is purchased
          // ...
          // Finish the transaction.
          inAppPurchase.finishTransactionByDate(transaction.transactionDate)
          break
        }
        case 'failed':
          console.log(`Failed to purchase ${product}.`)
          metrics.count("iap.transaction", 1, { state: "failed", product })
          // Finish the transaction.
          inAppPurchase.finishTransactionByDate(transaction.transactionDate)
          break
        case 'restored':
          console.log(`The purchase of ${product} has been restored.`)
          metrics.count("iap.transaction", 1, { state: "restored", product })
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
