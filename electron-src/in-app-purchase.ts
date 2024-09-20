// Main process
import { Event, inAppPurchase, Transaction } from 'electron'
const PRODUCT_IDS = ['io.kochie.touch-typer.monthly', 'io.kochie.touch-typer.yearly']
// const PRODUCT_IDS = ['monthly', 'yearly']

console.log("In-app purchase is available:", inAppPurchase.canMakePayments())

// Listen for transactions as soon as possible.
inAppPurchase.on('transactions-updated', (event: Event, transactions: Transaction[]) => {
  if (!Array.isArray(transactions)) {
    return
  }

  // Check each transaction.
  for (const transaction of transactions) {
    const payment = transaction.payment

    switch (transaction.transactionState) {
      case 'purchasing':
        console.log(`Purchasing ${payment.productIdentifier}...`)
        break
      case 'purchased': {
        console.log(`${payment.productIdentifier} purchased.`)
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
        console.log(`Failed to purchase ${payment.productIdentifier}.`)
        // Finish the transaction.
        inAppPurchase.finishTransactionByDate(transaction.transactionDate)
        break
      case 'restored':
        console.log(`The purchase of ${payment.productIdentifier} has been restored.`)
        break
      case 'deferred':
        console.log(`The purchase of ${payment.productIdentifier} has been deferred.`)
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

export async function getProducts(): Promise<Electron.Product[]> {
  const products = await inAppPurchase.getProducts(PRODUCT_IDS)

  console.log(products)
  return products
}

// Retrieve and display the product descriptions.
inAppPurchase.getProducts(PRODUCT_IDS).then(products => {
  // Check the parameters.
  if (!Array.isArray(products) || products.length <= 0) {
    console.log('Unable to retrieve the product information.')
    return
  }

  // Display the name and price of each product.
  for (const product of products) {
    console.log(`The price of ${product.localizedTitle} is ${product.formattedPrice}.`)
  }

  // Ask the user which product they want to purchase.
  const selectedProduct = products[0]
  const selectedQuantity = 1

  // Purchase the selected product.
  inAppPurchase.purchaseProduct(selectedProduct.productIdentifier, selectedQuantity).then(isProductValid => {
    if (!isProductValid) {
      console.log('The product is not valid.')
      return
    }

    console.log('The payment has been added to the payment queue.')
  })
})