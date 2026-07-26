import { INVOICE_ERROR_CODES } from './invoice/errorCodes.js';

/**
 * Centralized Formatting Utility for POS System.
 * Guarantees zero duplicate formatting logic across UI, Reports, and Printers.
 */

/**
 * Format Monetary Value
 * Example: 1250 -> "1,250.00" or "1,250"
 */
export const formatMoney = (amount, decimals = 2) => {
  const num = Number(amount) || 0;
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

/**
 * Format Product Quantity with Decimal Meter Precision
 * Example: 2.35 -> "2.35", 2 -> "2"
 */
export const formatQuantity = (quantity, maxDecimals = 2) => {
  const num = Number(quantity) || 0;
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals
  });
};

/**
 * Format Discount or Markup Percentage
 * Example: 20 -> "20%", -25 -> "+25% (زيادة)"
 */
export const formatPercentage = (percentage) => {
  const num = Number(percentage) || 0;
  if (num < 0) {
    return `+${Math.abs(num)}% (زيادة)`;
  }
  return `${num}%`;
};

/**
 * Localized Error Message Resolver for Invoice Error Codes
 */
export const getLocalizedErrorMessage = (errorCode, defaultMessage = 'حدث خطأ في عملية الفاتورة') => {
  switch (errorCode) {
    case INVOICE_ERROR_CODES.CONFLICT_STALE_VERSION:
      return 'تنبيه تعارض: تم تعديل هذه الفاتورة من جهاز آخر. يرجى تحديث الصفحة لمراجعة أحدث التغييرات.';
    case INVOICE_ERROR_CODES.INVALID_QUANTITY:
      return 'الكمية المدخلة غير صالحة. يجب أن تكون أكبر من 0.';
    case INVOICE_ERROR_CODES.INVALID_PRICE:
      return 'سعر المنتج غير صالحة. لا يمكن أن يكون السعر بالسالب.';
    case INVOICE_ERROR_CODES.INVALID_DISCOUNT:
      return 'نسبة الخصم / الزيادة غير صالحة. يجب أن تكون بين -100% و 100%.';
    case INVOICE_ERROR_CODES.INSUFFICIENT_STOCK:
      return 'المخزون غير كافٍ لإتمام التعديل.';
    case INVOICE_ERROR_CODES.PRINT_SNAPSHOT_INVALID:
      return 'تعذر إنشاء لقطة الطباعة. بيانات الفاتورة غير مكتملة.';
    case INVOICE_ERROR_CODES.INVALID_STATE_TRANSITION:
      return 'حالة الفاتورة غير صالحة لهذا الانتقال.';
    case INVOICE_ERROR_CODES.INVALID_INVOICE_DATA:
      return 'بيانات الفاتورة غير مكتملة أو غير صالحة.';
    default:
      return defaultMessage;
  }
};

export default {
  formatMoney,
  formatQuantity,
  formatPercentage,
  getLocalizedErrorMessage
};
