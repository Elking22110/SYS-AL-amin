import { INVOICE_ERROR_CODES } from './errorCodes.js';
import { calculateLineTotal, calculateSubtotal, calculateInvoiceTotals } from './calculations.js';
import { calculateDiscount, calculateMarkup, applyDiscountOrMarkup } from './discountEngine.js';
import { validateQuantity, validatePrice, validateDiscount, validateInvoice } from './validation.js';
import { calculateStockChanges } from './stockEngine.js';
import { processInvoiceEdit } from './editEngine.js';
import { generatePrintSnapshot } from './printSnapshot.js';
import { INVOICE_STATUS, canTransitionState, transitionInvoiceState } from './stateMachine.js';

/**
 * Single Authoritative Facade for POS Invoice Engine.
 * All UI components, printers, reports, and persistence layers interact via this facade.
 */
export const invoiceEngine = {
  // Error Codes
  ERROR_CODES: INVOICE_ERROR_CODES,
  
  // Status Constants & State Machine
  STATUS: INVOICE_STATUS,
  canTransitionState,
  transitionInvoiceState,

  // Calculations (Pure)
  calculateLineTotal,
  calculateSubtotal,
  calculateInvoiceTotals,

  // Discount & Markup (Pure)
  calculateDiscount,
  calculateMarkup,
  applyDiscountOrMarkup,

  // Validation (Pure)
  validateQuantity,
  validatePrice,
  validateDiscount,
  validateInvoice,

  // Stock Delta Engine (Pure)
  calculateStockChanges,

  // Edit Engine (Pure, Versioned)
  processInvoiceEdit,

  // Print Snapshot Generator (Pure)
  generatePrintSnapshot
};

export {
  INVOICE_ERROR_CODES,
  INVOICE_STATUS,
  calculateLineTotal,
  calculateSubtotal,
  calculateInvoiceTotals,
  calculateDiscount,
  calculateMarkup,
  applyDiscountOrMarkup,
  validateQuantity,
  validatePrice,
  validateDiscount,
  validateInvoice,
  calculateStockChanges,
  processInvoiceEdit,
  generatePrintSnapshot
};

export default invoiceEngine;
