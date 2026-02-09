// Main process – Mac App Store in-app purchase
import { BrowserWindow, Event, inAppPurchase, Transaction } from "electron";

const PRODUCT_IDS = ["io.kochie.touch-typer.monthly", "io.kochie.touch-typer.yearly"];

let iapWindow: BrowserWindow | null = null;

export function setIAPWindow(window: BrowserWindow | null) {
  iapWindow = window;
}

function sendPurchaseCompleteToRenderer(transactionId: string) {
  if (iapWindow && !iapWindow.isDestroyed()) {
    iapWindow.webContents.send("iap-purchase-complete", transactionId);
  }
}

// Listen for transactions as soon as possible.
inAppPurchase.on(
  "transactions-updated",
  (event: Event, transactions: Transaction[]) => {
    if (!Array.isArray(transactions)) {
      return;
    }

    for (const transaction of transactions) {
      const payment = transaction.payment;

      switch (transaction.transactionState) {
        case "purchasing":
          console.log(`Purchasing ${payment.productIdentifier}...`);
          break;
        case "purchased": {
          console.log(`${payment.productIdentifier} purchased.`);
          const transactionId = transaction.transactionIdentifier;
          if (transactionId) {
            sendPurchaseCompleteToRenderer(transactionId);
          }
          inAppPurchase.finishTransactionByDate(transaction.transactionDate);
          break;
        }
        case "failed":
          console.log(`Failed to purchase ${payment.productIdentifier}.`);
          inAppPurchase.finishTransactionByDate(transaction.transactionDate);
          break;
        case "restored":
          console.log(`The purchase of ${payment.productIdentifier} has been restored.`);
          if (transaction.transactionIdentifier) {
            sendPurchaseCompleteToRenderer(transaction.transactionIdentifier);
          }
          break;
        case "deferred":
          console.log(`The purchase of ${payment.productIdentifier} has been deferred.`);
          break;
        default:
          break;
      }
    }
  }
);

if (!inAppPurchase.canMakePayments()) {
  console.log("The user is not allowed to make in-app purchase.");
}

export async function getProducts(): Promise<Electron.Product[]> {
  const products = await inAppPurchase.getProducts(PRODUCT_IDS);
  return products;
}

export async function purchaseProduct(
  productId: string,
  quantity: number = 1
): Promise<boolean> {
  return inAppPurchase.purchaseProduct(productId, quantity);
}
