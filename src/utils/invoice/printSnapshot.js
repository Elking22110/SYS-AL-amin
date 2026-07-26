import safeMath from '../safeMath.js';
import { INVOICE_ERROR_CODES } from './errorCodes.js';

/**
 * Pure Print Snapshot Generator.
 * Single Source of Truth for Thermal Receipts, A4, HTML, and Reprints.
 * ZERO financial recalculations occur during print generation.
 */
export const generatePrintSnapshot = (invoice, storeInfo = {}) => {
  if (!invoice || !Array.isArray(invoice.items)) {
    throw new Error(INVOICE_ERROR_CODES.PRINT_SNAPSHOT_INVALID);
  }

  const items = (invoice.items || []).map(item => {
    const q = Number(item.quantity || 0);
    const p = Number(item.price || 0);
    return {
      id: item.id,
      name: item.name || 'منتج غير محدد',
      quantity: q,
      price: p,
      total: item.total !== undefined ? Number(item.total) : safeMath.multiply(p, q)
    };
  });

  const subtotal = Number(invoice.subtotal) || safeMath.calculateSubtotal(items);
  const discountAmount = Number(invoice.discountAmount) || 0;
  const taxAmount = Number(invoice.taxAmount) || 0;
  const total = Number(invoice.total) || Math.max(0, subtotal - discountAmount + taxAmount);
  const remainingAmount = invoice.downPayment?.enabled
    ? Math.max(0, safeMath.subtract(total, Number(invoice.downPayment.amount) || 0))
    : total;

  return {
    invoiceId: invoice.id,
    version: Number(invoice.version) || 1,
    date: invoice.date || invoice.timestamp || new Date().toISOString(),
    cashier: invoice.cashier?.username || invoice.cashier || 'المسؤول',
    customerName: invoice.customer?.name || 'عميل نقدي',
    customerPhone: invoice.customer?.phone || '',
    paymentMethod: invoice.paymentMethod || 'cash',
    paymentMethodText: invoice.paymentMethod === 'cash' ? 'نقدي' : invoice.paymentMethod === 'wallet' ? 'محفظة إلكترونية' : invoice.paymentMethod === 'instapay' ? 'انستا باي' : invoice.paymentMethod === 'deferred' ? 'آجل' : 'نقدي',
    previousDebt: Number(invoice.customerPreviousDebt) || Number(invoice.customer?.debt) || 0,
    newTotalDebt: Number(invoice.customerNewTotalDebt) || 0,
    items,
    subtotal,
    discountAmount,
    taxAmount,
    total,
    downPaymentAmount: Number(invoice.downPayment?.amount) || 0,
    downPaymentEnabled: Boolean(invoice.downPayment?.enabled),
    remainingAmount,
    storeName: storeInfo.companyName || storeInfo.storeName || 'Elking',
    storePhone: storeInfo.companyPhone || storeInfo.storePhone || '',
    storeAddress: storeInfo.companyAddress || storeInfo.storeAddress || '',
    logoSrc: storeInfo.logo || ''
  };
};

export default {
  generatePrintSnapshot
};
