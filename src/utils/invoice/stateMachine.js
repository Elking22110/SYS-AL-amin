import { INVOICE_ERROR_CODES } from './errorCodes.js';

export const INVOICE_STATUS = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  PAID: 'Paid',
  PARTIALLY_PAID: 'Partially Paid',
  PRINTED: 'Printed',
  SYNCED: 'Synced',
  PARTIALLY_RETURNED: 'Partially Returned',
  RETURNED: 'Returned',
  CANCELLED: 'Cancelled'
};

const ALLOWED_TRANSITIONS = {
  [INVOICE_STATUS.DRAFT]: [INVOICE_STATUS.PENDING, INVOICE_STATUS.PAID, INVOICE_STATUS.CANCELLED],
  [INVOICE_STATUS.PENDING]: [INVOICE_STATUS.PAID, INVOICE_STATUS.PARTIALLY_PAID, INVOICE_STATUS.CANCELLED],
  [INVOICE_STATUS.PAID]: [INVOICE_STATUS.PRINTED, INVOICE_STATUS.SYNCED, INVOICE_STATUS.PARTIALLY_RETURNED, INVOICE_STATUS.RETURNED],
  [INVOICE_STATUS.PARTIALLY_PAID]: [INVOICE_STATUS.PAID, INVOICE_STATUS.PRINTED, INVOICE_STATUS.SYNCED, INVOICE_STATUS.CANCELLED],
  [INVOICE_STATUS.PRINTED]: [INVOICE_STATUS.SYNCED, INVOICE_STATUS.PARTIALLY_RETURNED, INVOICE_STATUS.RETURNED],
  [INVOICE_STATUS.SYNCED]: [INVOICE_STATUS.PRINTED, INVOICE_STATUS.PARTIALLY_RETURNED, INVOICE_STATUS.RETURNED],
  [INVOICE_STATUS.PARTIALLY_RETURNED]: [INVOICE_STATUS.RETURNED, INVOICE_STATUS.SYNCED],
  [INVOICE_STATUS.RETURNED]: [],
  [INVOICE_STATUS.CANCELLED]: []
};

/**
 * Validate State Transition
 */
export const canTransitionState = (currentStatus, targetStatus) => {
  if (!currentStatus) return true; // Initial creation
  if (currentStatus === targetStatus) return true;
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
};

/**
 * Transition Invoice Status
 */
export const transitionInvoiceState = (invoice, targetStatus) => {
  const current = invoice?.status || INVOICE_STATUS.PAID;
  if (!canTransitionState(current, targetStatus)) {
    return {
      success: false,
      error: INVOICE_ERROR_CODES.INVALID_STATE_TRANSITION,
      message: `Cannot transition invoice from ${current} to ${targetStatus}`
    };
  }
  return {
    success: true,
    status: targetStatus
  };
};

export default {
  INVOICE_STATUS,
  canTransitionState,
  transitionInvoiceState
};
