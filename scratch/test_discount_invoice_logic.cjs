const { calculateInvoiceTotals, calculateLineTotal } = require('../src/utils/invoice/calculations.js');
const { generatePrintSnapshot } = require('../src/utils/invoice/printSnapshot.js');
const { processInvoiceEdit } = require('../src/utils/invoice/editEngine.js');

console.log('--- Testing Per-Product Discount Calculation Engine ---');

const testItems = [
  { id: '1', name: 'منتج A', price: 100, quantity: 5, itemDiscount: 10 }, // Gross: 500, Disc: 50, Net: 450
  { id: '2', name: 'منتج B', price: 250, quantity: 2, itemDiscount: 5 },  // Gross: 500, Disc: 25, Net: 475
  { id: '3', name: 'منتج C', price: 300, quantity: 1, itemDiscount: 0 }   // Gross: 300, Disc: 0, Net: 300
];

const totals = calculateInvoiceTotals({ items: testItems });

console.log('Gross Subtotal (Expected 1300):', totals.grossSubtotal);
console.log('Total Item Discounts (Expected 75):', totals.totalItemDiscounts);
console.log('Net Subtotal (Expected 1225):', totals.subtotal);
console.log('Final Total (Expected 1225):', totals.total);

if (totals.grossSubtotal !== 1300 || totals.totalItemDiscounts !== 75 || totals.total !== 1225) {
  console.error('FAILED: Calculation totals mismatch!');
  process.exit(1);
}

console.log('\n--- Testing Print Snapshot Engine ---');
const sampleInvoice = {
  id: 'INV-1001',
  items: testItems,
  subtotal: totals.subtotal,
  discountAmount: 0,
  taxAmount: 0,
  total: totals.total,
  customer: { name: 'شركة النيل للمقاولات', phone: '01119622551' }
};

const snapshot = generatePrintSnapshot(sampleInvoice);

console.log('Snapshot grossSubtotal:', snapshot.grossSubtotal);
console.log('Snapshot totalDiscounts:', snapshot.totalDiscounts);
console.log('Snapshot items length:', snapshot.items.length);
snapshot.items.forEach(it => {
  console.log(`Item: ${it.name} | Qty: ${it.quantity} | UnitPrice: ${it.price} | Disc%: ${it.itemDiscount}% | LineGross: ${it.lineGross} | LineDisc: ${it.lineDiscountAmount} | LineNet: ${it.total}`);
});

if (snapshot.grossSubtotal !== 1300 || snapshot.totalDiscounts !== 75) {
  console.error('FAILED: Snapshot totals mismatch!');
  process.exit(1);
}

console.log('\n--- Testing Return Engine with Discounted Product ---');
// Return 1 unit of Item A (priced 100 with 10% discount => net 90)
const newItemsAfterReturn = [
  { id: '1', name: 'منتج A', price: 100, quantity: 4, itemDiscount: 10 },
  { id: '2', name: 'منتج B', price: 250, quantity: 2, itemDiscount: 5 },
  { id: '3', name: 'منتج C', price: 300, quantity: 1, itemDiscount: 0 }
];

const editResult = processInvoiceEdit(sampleInvoice, newItemsAfterReturn);
console.log('Return process success:', editResult.success);
console.log('Return entries count:', editResult.returnEntries.length);
const retEntry = editResult.returnEntries[0];
console.log('Returned item name:', retEntry.item.name);
console.log('Returned item quantity:', retEntry.item.quantity);
console.log('Returned item refund amount (Expected 90):', retEntry.amount);

if (retEntry.amount !== 90) {
  console.error('FAILED: Return refund amount mismatch! Expected 90, got', retEntry.amount);
  process.exit(1);
}

console.log('\n✅ ALL DIAGNOSTIC TESTS PASSED SUCCESSFULLY!');
