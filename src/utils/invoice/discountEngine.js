import safeMath from '../safeMath.js';

/**
 * Pure Discount & Markup Engine for POS System.
 * Supports positive discounts (price reduction) and negative discounts (markup: -100% to +100%).
 */

/**
 * Calculate Discount / Markup Amount from Subtotal
 */
export const calculateDiscount = (subtotal, percentageStr) => {
  const percentage = Number(percentageStr) || 0;
  if (percentage === 0) return 0;
  return safeMath.calculatePercentage(subtotal, percentage);
};

/**
 * Calculate Markup Amount from Subtotal
 */
export const calculateMarkup = (subtotal, percentageStr) => {
  const percentage = Number(percentageStr) || 0;
  if (percentage >= 0) return 0;
  return Math.abs(safeMath.calculatePercentage(subtotal, percentage));
};

/**
 * Apply Discount / Markup to Subtotal
 * Final = Subtotal - DiscountAmount (if discount is -25, subtotal - (-250) = subtotal + 250)
 */
export const applyDiscountOrMarkup = (subtotal, percentageStr) => {
  const discAmt = calculateDiscount(subtotal, percentageStr);
  return safeMath.subtract(subtotal, discAmt);
};

export default {
  calculateDiscount,
  calculateMarkup,
  applyDiscountOrMarkup
};
