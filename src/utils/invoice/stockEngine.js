import safeMath from '../safeMath.js';

/**
 * Pure Stock Movement Engine for Invoice System.
 * Calculates exact stock deltas without direct database mutations.
 */

/**
 * Calculate Stock Delta per Product
 * diff = newQty - oldQty
 * - If diff > 0 (Additional Sale): stock change is -diff (reduce stock by diff)
 * - If diff < 0 (Return): stock change is +abs(diff) (increase stock by abs(diff))
 * - If diff == 0: stock change is 0
 */
export const calculateStockChanges = (oldItems = [], newItems = []) => {
  const oldItemsMap = new Map((oldItems || []).map(i => [String(i.id), Number(i.quantity) || 0]));
  const allIds = new Set([
    ...(oldItems || []).map(i => String(i.id)),
    ...(newItems || []).map(i => String(i.id))
  ]);

  const stockChanges = [];

  for (const id of allIds) {
    const oldQty = oldItemsMap.get(id) || 0;
    const newItem = (newItems || []).find(i => String(i.id) === id);
    const newQty = newItem ? Number(newItem.quantity) || 0 : 0;
    const diff = safeMath.subtract(newQty, oldQty);

    if (diff !== 0) {
      stockChanges.push({
        productId: id,
        oldQty,
        newQty,
        diff,
        // stockDelta is -diff (subtracting diff from current stock)
        stockDelta: -diff,
        isAdditionalSale: diff > 0,
        isReturn: diff < 0,
        returnedQty: diff < 0 ? Math.abs(diff) : 0
      });
    }
  }

  return stockChanges;
};

export default {
  calculateStockChanges
};
