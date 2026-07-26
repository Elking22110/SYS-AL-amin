import safeMath from '../safeMath.js';
import { calculateInvoiceTotals } from './calculations.js';
import { calculateStockChanges } from './stockEngine.js';
import { validateInvoice } from './validation.js';
import { INVOICE_ERROR_CODES } from './errorCodes.js';

/**
 * Pure Invoice Edit Engine.
 * Compares invoice states, increments version, and computes returns/stock changes with ZERO side effects.
 */

/**
 * Compare Invoice Items and Generate Edit Payloads
 */
export const processInvoiceEdit = (oldInvoice, newItems, options = {}) => {
  const { currentShiftId = null, user = 'system', device = 'POS Client', reason = 'Invoice Edit' } = options;

  // 1. Optimistic Concurrency Control Check (version)
  if (options.expectedVersion !== undefined && oldInvoice.version !== undefined) {
    if (Number(options.expectedVersion) !== Number(oldInvoice.version)) {
      return {
        success: false,
        errorCode: INVOICE_ERROR_CODES.CONFLICT_STALE_VERSION,
        message: 'Invoice has been edited by another device. Please refresh.'
      };
    }
  }

  // 2. Validate New Invoice Items
  const tempInvoice = { ...oldInvoice, items: newItems };
  const validation = validateInvoice(tempInvoice);
  if (!validation.isValid) {
    return {
      success: false,
      errorCode: validation.errors[0] || INVOICE_ERROR_CODES.INVALID_INVOICE_DATA,
      errors: validation.errors
    };
  }

  // 3. Compute Stock Changes
  const stockChanges = calculateStockChanges(oldInvoice.items, newItems);

  // 4. Generate Return Entries (ONLY for items where diff < 0)
  const returnEntries = [];
  for (const change of stockChanges) {
    if (change.isReturn) {
      const oldItem = (oldInvoice.items || []).find(i => String(i.id) === String(change.productId));
      const newItem = newItems.find(i => String(i.id) === String(change.productId));
      const itemObj = oldItem || newItem;
      const refundAmount = safeMath.multiply(itemObj?.price || 0, change.returnedQty);

      const returnEntry = {
        id: `RET_${Date.now()}_${change.productId}_${Math.random().toString(36).substr(2, 6)}`,
        timestamp: new Date().toISOString(),
        refInvoiceId: oldInvoice.id,
        customer: oldInvoice.customer || { name: 'غير محدد', phone: '' },
        item: {
          id: change.productId,
          name: itemObj?.name || 'منتج غير معروف',
          quantity: change.returnedQty
        },
        amount: refundAmount,
        shiftId: currentShiftId
      };
      returnEntries.push(returnEntry);
    }
  }

  // 5. Recalculate Invoice Totals
  const discountInfo = {
    type: oldInvoice.discountPercentage !== undefined && oldInvoice.discountPercentage !== 0 ? 'percentage' : 'fixed',
    fixed: oldInvoice.discountAmount || 0,
    percentage: oldInvoice.discountPercentage || 0
  };
  const taxInfo = {
    enabled: Boolean(oldInvoice.taxAmount),
    vat: oldInvoice.taxPercentage || 0
  };
  const downPaymentInfo = oldInvoice.downPayment || {};

  const totals = calculateInvoiceTotals({
    items: newItems,
    discount: discountInfo,
    tax: taxInfo,
    downPayment: downPaymentInfo
  });

  // 6. Increment Version (Optimistic Concurrency)
  const currentVersion = Number(oldInvoice.version) || 1;
  const newVersion = currentVersion + 1;

  const updatedInvoice = {
    ...oldInvoice,
    items: totals.items,
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount,
    taxAmount: totals.taxAmount,
    total: totals.total,
    version: newVersion,
    updated_at: new Date().toISOString()
  };

  if (updatedInvoice.downPayment && updatedInvoice.downPayment.enabled) {
    updatedInvoice.downPayment.remaining = totals.remainingAmount;
    if (totals.remainingAmount <= 0) {
      updatedInvoice.downPayment.enabled = false;
      updatedInvoice.paymentStatus = 'complete';
    }
  }

  // 7. Generate Audit Log Entry
  const auditLog = {
    id: `AUDIT_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    invoiceId: oldInvoice.id,
    version: newVersion,
    timestamp: new Date().toISOString(),
    user,
    device,
    reason,
    stockChanges,
    returnEntriesCount: returnEntries.length,
    oldTotal: oldInvoice.total,
    newTotal: totals.total
  };

  return {
    success: true,
    updatedInvoice,
    stockChanges,
    returnEntries,
    auditLog
  };
};

export default {
  processInvoiceEdit
};
