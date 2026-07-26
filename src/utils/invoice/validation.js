import { INVOICE_ERROR_CODES } from './errorCodes.js';

/**
 * Pure Business Rule Validation Module for Invoice System.
 * Returns array of error codes or boolean validation status.
 */

/**
 * Validate Quantity
 */
export const validateQuantity = (quantity, allowReturn = false) => {
  const q = Number(quantity);
  if (isNaN(q)) return { isValid: false, errorCode: INVOICE_ERROR_CODES.INVALID_QUANTITY };
  if (!allowReturn && q <= 0) return { isValid: false, errorCode: INVOICE_ERROR_CODES.INVALID_QUANTITY };
  return { isValid: true };
};

/**
 * Validate Unit Price
 */
export const validatePrice = (price) => {
  const p = Number(price);
  if (isNaN(p) || p < 0) return { isValid: false, errorCode: INVOICE_ERROR_CODES.INVALID_PRICE };
  return { isValid: true };
};

/**
 * Validate Discount / Markup Range (-100% to +100%)
 */
export const validateDiscount = (percentage) => {
  const p = Number(percentage);
  if (isNaN(p) || p < -100 || p > 100) {
    return { isValid: false, errorCode: INVOICE_ERROR_CODES.INVALID_DISCOUNT };
  }
  return { isValid: true };
};

/**
 * Validate Complete Invoice Object
 */
export const validateInvoice = (invoice) => {
  const errors = [];
  if (!invoice || !Array.isArray(invoice.items) || invoice.items.length === 0) {
    errors.push(INVOICE_ERROR_CODES.INVALID_INVOICE_DATA);
  } else {
    for (const item of invoice.items) {
      const qVal = validateQuantity(item.quantity);
      if (!qVal.isValid) errors.push(qVal.errorCode);
      const pVal = validatePrice(item.price);
      if (!pVal.isValid) errors.push(pVal.errorCode);
    }
  }

  if (invoice?.discountPercentage !== undefined) {
    const dVal = validateDiscount(invoice.discountPercentage);
    if (!dVal.isValid) errors.push(dVal.errorCode);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export default {
  validateQuantity,
  validatePrice,
  validateDiscount,
  validateInvoice
};
