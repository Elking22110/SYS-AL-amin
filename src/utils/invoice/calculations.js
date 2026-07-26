import safeMath from '../safeMath.js';

/**
 * Pure Mathematical Calculations for Invoice System.
 * All monetary amounts are processed with safeMath integer cents to prevent floating point errors.
 */

/**
 * Calculate Line Item Total
 */
export const calculateLineTotal = (price, quantity, itemDiscountPercentage = 0) => {
  const p = Number(price) || 0;
  const q = Number(quantity) || 0;
  const rawLine = safeMath.multiply(p, q);
  const discPct = Number(itemDiscountPercentage) || 0;
  if (discPct === 0) return rawLine;
  const discAmt = safeMath.calculatePercentage(rawLine, discPct);
  return safeMath.subtract(rawLine, discAmt);
};

/**
 * Calculate Subtotal of Items
 */
export const calculateSubtotal = (items = []) => {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => {
    const itemTotal = calculateLineTotal(item.price, item.quantity, item.itemDiscount);
    return safeMath.add(sum, itemTotal);
  }, 0);
};

/**
 * Calculate Full Invoice Totals
 */
export const calculateInvoiceTotals = ({ items = [], discount = {}, tax = {}, downPayment = {} }) => {
  const safeItems = (items || []).map(item => {
    const price = Number(item.price) || 0;
    const quantity = Number(item.quantity) || 0;
    const itemDiscount = Number(item.itemDiscount) || 0;
    const total = calculateLineTotal(price, quantity, itemDiscount);
    return {
      ...item,
      price,
      quantity,
      itemDiscount,
      total
    };
  });

  const subtotal = safeItems.reduce((sum, item) => safeMath.add(sum, item.total), 0);

  let discountAmount = 0;
  let discountPercentage = 0;

  if (discount.type === 'fixed') {
    discountAmount = Number(discount.fixed) || 0;
  } else {
    discountPercentage = Number(discount.percentage) || 0;
    discountAmount = safeMath.calculatePercentage(subtotal, discountPercentage);
  }

  // Taxable amount = subtotal - discountAmount
  // If discountAmount is negative (markup), subtotal - (-val) = subtotal + val
  const taxableAmount = safeMath.subtract(subtotal, discountAmount);

  let taxAmount = 0;
  if (tax && tax.enabled) {
    taxAmount = safeMath.calculatePercentage(Math.max(0, taxableAmount), Number(tax.vat) || 0);
  }

  const total = Math.max(0, safeMath.add(taxableAmount, taxAmount));

  let remainingAmount = total;
  if (downPayment && downPayment.enabled) {
    const dpPaid = Number(downPayment.amount) || 0;
    remainingAmount = Math.max(0, safeMath.subtract(total, dpPaid));
  }

  return {
    items: safeItems,
    subtotal,
    discountAmount,
    discountPercentage,
    taxAmount,
    total,
    remainingAmount
  };
};

export default {
  calculateLineTotal,
  calculateSubtotal,
  calculateInvoiceTotals
};
