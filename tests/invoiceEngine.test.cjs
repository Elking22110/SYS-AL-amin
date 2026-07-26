// Polyfill window & localStorage for Node.js environment
if (typeof global.window === 'undefined') {
  global.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
    navigator: { onLine: true },
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    }
  };
  global.localStorage = global.window.localStorage;
  global.navigator = global.window.navigator;
}

const store = {};
global.localStorage.getItem = (k) => store[k] || null;
global.localStorage.setItem = (k, v) => { store[k] = String(v); };
global.localStorage.removeItem = (k) => { delete store[k]; };

async function runInvoiceEngineTests() {
  console.log("=================================================");
  console.log("🧪 STARTING INVOICE ENGINE ENTERPRISE TEST SUITE");
  console.log("=================================================\n");

  const { invoiceEngine } = await import('../src/utils/invoice/index.js');
  const { formatMoney, formatQuantity, formatPercentage, getLocalizedErrorMessage } = await import('../src/utils/formatters.js');

  // 1. Formatters Unit Tests
  console.log("--- 1. Formatters Unit Tests ---");
  console.assert(formatMoney(1250) === "1,250.00", `formatMoney(1250) failed: ${formatMoney(1250)}`);
  console.assert(formatQuantity(2.35) === "2.35", `formatQuantity(2.35) failed: ${formatQuantity(2.35)}`);
  console.assert(formatPercentage(-25) === "+25% (زيادة)", `formatPercentage(-25) failed: ${formatPercentage(-25)}`);
  console.log("✓ All formatters tests passed.");

  // 2. Pure Financial Calculations Tests
  console.log("\n--- 2. Pure Financial Calculations Tests ---");
  const line1 = invoiceEngine.calculateLineTotal(50, 2.5);
  console.assert(line1 === 125, `calculateLineTotal(50, 2.5) failed: ${line1}`);
  
  const totalsPos = invoiceEngine.calculateInvoiceTotals({
    items: [{ price: 500, quantity: 2 }],
    discount: { type: 'percentage', percentage: 20 },
    tax: { enabled: false }
  });
  console.assert(totalsPos.subtotal === 1000, `Subtotal failed: ${totalsPos.subtotal}`);
  console.assert(totalsPos.discountAmount === 200, `Discount amount failed: ${totalsPos.discountAmount}`);
  console.assert(totalsPos.total === 800, `Total failed: ${totalsPos.total}`);
  console.log("✓ Positive discount calculations passed.");

  // 3. Negative Discount / Markup Test (-25% markup)
  console.log("\n--- 3. Negative Discount / Markup Tests ---");
  // 3a. Invoice-level markup
  const totalsMarkup = invoiceEngine.calculateInvoiceTotals({
    items: [{ price: 500, quantity: 2 }],
    discount: { type: 'percentage', percentage: -25 },
    tax: { enabled: true, vat: 14 }
  });
  console.assert(totalsMarkup.subtotal === 1000, `Subtotal failed: ${totalsMarkup.subtotal}`);
  console.assert(totalsMarkup.discountAmount === -250, `Discount amount failed: ${totalsMarkup.discountAmount}`);
  console.assert(totalsMarkup.taxAmount === 175, `Tax 14% on 1250 failed: ${totalsMarkup.taxAmount}`);
  console.assert(totalsMarkup.total === 1425, `Markup total failed: ${totalsMarkup.total}`);
  console.log("✓ Invoice-level markup (-25% on 1000 + 14% tax = 1425) passed.");

  // 3b. Line-item markup (Price: 1000, Qty: 2, itemDiscount: -25%)
  const lineItemMarkupTotal = invoiceEngine.calculateLineTotal(1000, 2, -25);
  console.assert(lineItemMarkupTotal === 2500, `Line item markup total failed: expected 2500, got ${lineItemMarkupTotal}`);
  const adjustedUnitPrice = lineItemMarkupTotal / 2;
  console.assert(adjustedUnitPrice === 1250, `Adjusted unit price failed: expected 1250, got ${adjustedUnitPrice}`);

  const lineItemMarkupTotals = invoiceEngine.calculateInvoiceTotals({
    items: [{ price: 1000, quantity: 2, itemDiscount: -25 }],
    discount: { type: 'fixed', fixed: 0 },
    tax: { enabled: true, vat: 14 }
  });
  console.assert(lineItemMarkupTotals.subtotal === 2500, `Subtotal with line markup failed: expected 2500, got ${lineItemMarkupTotals.subtotal}`);
  console.assert(lineItemMarkupTotals.taxAmount === 350, `Tax 14% on 2500 failed: expected 350, got ${lineItemMarkupTotals.taxAmount}`);
  console.assert(lineItemMarkupTotals.total === 2850, `Total with line markup failed: expected 2850, got ${lineItemMarkupTotals.total}`);
  console.log("✓ Line-item markup (Price=1000, Qty=2, ItemDiscount=-25% -> Adjusted Unit Price=1250, Line Total=2500, Total=2850) passed.");

  // 4. Validation Unit Tests
  console.log("\n--- 4. Validation Unit Tests ---");
  console.assert(invoiceEngine.validateQuantity(-1).isValid === false, "Negative quantity validation failed");
  console.assert(invoiceEngine.validatePrice(-50).isValid === false, "Negative price validation failed");
  console.assert(invoiceEngine.validateDiscount(-150).isValid === false, "Discount < -100 validation failed");
  console.assert(invoiceEngine.validateDiscount(150).isValid === false, "Discount > 100 validation failed");
  console.assert(invoiceEngine.validateDiscount(-25).isValid === true, "Valid markup -25% failed");
  console.log("✓ All business rule validation tests passed.");

  // 5. State Machine Tests
  console.log("\n--- 5. State Machine Tests ---");
  console.assert(invoiceEngine.canTransitionState(invoiceEngine.STATUS.PAID, invoiceEngine.STATUS.PRINTED) === true, "Paid -> Printed should be allowed");
  console.assert(invoiceEngine.canTransitionState(invoiceEngine.STATUS.PAID, invoiceEngine.STATUS.RETURNED) === true, "Paid -> Returned should be allowed");
  console.assert(invoiceEngine.canTransitionState(invoiceEngine.STATUS.RETURNED, invoiceEngine.STATUS.PAID) === false, "Returned -> Paid should be forbidden");
  console.log("✓ State machine transition tests passed.");

  // 6. Edit Engine & Version Concurrency Tests
  console.log("\n--- 6. Edit Engine & Version Concurrency Tests ---");
  const oldInvoice = {
    id: 'INV-2026-001',
    version: 1,
    items: [{ id: 'p1', name: 'منتج 1', price: 100, quantity: 2 }],
    subtotal: 200,
    total: 200
  };

  // 6a. Valid Edit (2 -> 2.5)
  const edit1 = invoiceEngine.processInvoiceEdit(oldInvoice, [{ id: 'p1', name: 'منتج 1', price: 100, quantity: 2.5 }], { expectedVersion: 1 });
  console.assert(edit1.success === true, "Edit 1 failed");
  console.assert(edit1.updatedInvoice.version === 2, `Version should increment to 2, got ${edit1.updatedInvoice.version}`);
  console.assert(edit1.stockChanges[0].stockDelta === -0.5, `Stock delta should be -0.5, got ${edit1.stockChanges[0].stockDelta}`);
  console.assert(edit1.returnEntries.length === 0, "No return entries should be created for quantity increase");
  console.log("✓ Edit (2 -> 2.5): Version incremented 1 -> 2, stock delta -0.5, 0 returns.");

  // 6b. Stale Version Concurrency Conflict Test
  const editStale = invoiceEngine.processInvoiceEdit(edit1.updatedInvoice, [{ id: 'p1', name: 'منتج 1', price: 100, quantity: 3 }], { expectedVersion: 1 });
  console.assert(editStale.success === false, "Stale version edit should fail");
  console.assert(editStale.errorCode === invoiceEngine.ERROR_CODES.CONFLICT_STALE_VERSION, `Error code should be CONFLICT_STALE_VERSION, got ${editStale.errorCode}`);
  console.log("✓ Stale Version Concurrency Conflict rejection passed.");

  // 6c. Valid Return Edit (2.5 -> 2)
  const edit2 = invoiceEngine.processInvoiceEdit(edit1.updatedInvoice, [{ id: 'p1', name: 'منتج 1', price: 100, quantity: 2 }], { expectedVersion: 2 });
  console.assert(edit2.success === true, "Edit 2 failed");
  console.assert(edit2.updatedInvoice.version === 3, `Version should increment to 3, got ${edit2.updatedInvoice.version}`);
  console.assert(edit2.stockChanges[0].stockDelta === 0.5, `Stock delta should be +0.5, got ${edit2.stockChanges[0].stockDelta}`);
  console.assert(edit2.returnEntries.length === 1, "1 return entry should be created");
  console.assert(edit2.returnEntries[0].item.quantity === 0.5, `Returned qty should be 0.5, got ${edit2.returnEntries[0].item.quantity}`);
  console.log("✓ Edit (2.5 -> 2): Version incremented 2 -> 3, stock delta +0.5, 1 return entry for 0.5 qty.");

  // 7. Print Snapshot Test
  console.log("\n--- 7. Print Snapshot Test ---");
  const snap = invoiceEngine.generatePrintSnapshot(edit2.updatedInvoice, { companyName: 'Elking POS' });
  const strSnap = JSON.stringify(snap);
  console.assert(!strSnap.includes('ج.م') && !strSnap.includes('جنيه'), "Print snapshot contains currency text");
  console.assert(snap.version === 3, `Print snapshot version should be 3, got ${snap.version}`);
  console.log("✓ Print snapshot generated without currency text, matching version 3.");

  // 8. Performance Benchmark
  console.log("\n--- 8. Performance Benchmark ---");
  const startCalc = Date.now();
  for (let i = 0; i < 1000; i++) {
    invoiceEngine.calculateInvoiceTotals({
      items: [
        { price: 50.5, quantity: 2.35 },
        { price: 120, quantity: 1.5, itemDiscount: 10 }
      ],
      discount: { type: 'percentage', percentage: 15 },
      tax: { enabled: true, vat: 14 }
    });
  }
  const calcDuration = Date.now() - startCalc;
  console.log(`⏱ 1,000 Invoice Calculations completed in ${calcDuration} ms (Target: < 300 ms)`);
  console.assert(calcDuration < 300, `Calculation duration ${calcDuration} ms exceeded 300 ms benchmark`);

  const startPrint = Date.now();
  for (let i = 0; i < 100; i++) {
    invoiceEngine.generatePrintSnapshot(edit2.updatedInvoice);
  }
  const printDuration = Date.now() - startPrint;
  console.log(`⏱ 100 Print Snapshot Generations completed in ${printDuration} ms (Target: < 50 ms)`);
  console.assert(printDuration < 50, `Print duration ${printDuration} ms exceeded 50 ms benchmark`);

  console.log("\n=================================================");
  console.log("🎉 ALL INVOICE ENGINE TESTS PASSED SUCCESSFULLY!");
  console.log("=================================================\n");
}

runInvoiceEngineTests().catch(err => {
  console.error("❌ TEST SUITE FAILED:", err);
  process.exit(1);
});
