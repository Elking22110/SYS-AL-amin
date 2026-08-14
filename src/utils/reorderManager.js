/**
 * SIS AL AMEEN — Safe Manual Product Reordering Manager
 * 
 * Handles sort_order calculations, subcategory isolation, and initial index assignment.
 */

/**
 * Assigns initial sort_order to a list of products if not already present.
 * Preserves exact current authoritative display order.
 */
export function ensureSortOrders(products = []) {
  if (!Array.isArray(products)) return [];

  let currentOrder = 10;
  return products.map((product) => {
    if (product.sort_order === undefined || product.sort_order === null || isNaN(Number(product.sort_order))) {
      const assigned = { ...product, sort_order: currentOrder };
      currentOrder += 10;
      return assigned;
    }
    return product;
  });
}

/**
 * Reorders a product within a list (strictly within the same subcategory).
 * @param {Array} subcategoryProducts - The list of products in the current subcategory.
 * @param {number} fromIndex - Original index of the product being moved.
 * @param {number} toIndex - Target index where the product is dropped.
 * @returns {Object} { reorderedList, updatedProducts }
 */
export function calculateReorder(subcategoryProducts = [], fromIndex, toIndex) {
  if (
    !Array.isArray(subcategoryProducts) ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= subcategoryProducts.length ||
    toIndex >= subcategoryProducts.length ||
    fromIndex === toIndex
  ) {
    return { reorderedList: subcategoryProducts, updatedProducts: [] };
  }

  const list = [...subcategoryProducts];
  const [movedProduct] = list.splice(fromIndex, 1);
  list.splice(toIndex, 0, movedProduct);

  const nowIso = new Date().toISOString();
  
  // ALL products in the subcategory list get assigned fresh explicit sort_order values (spaced by 10)
  // This guarantees that all affected items persist their relative ordering cleanly.
  const reorderedList = list.map((item, idx) => {
    return {
      ...item,
      sort_order: (idx + 1) * 10,
      updated_at: nowIso
    };
  });

  return { reorderedList, updatedProducts: reorderedList };
}

/**
 * Assigns sort_order for a brand new product added to a subcategory.
 * Takes max(sort_order) + 10.
 */
export function getNextSortOrder(subcategoryProducts = []) {
  if (!Array.isArray(subcategoryProducts) || subcategoryProducts.length === 0) {
    return 10;
  }
  const maxSort = subcategoryProducts.reduce((max, p) => {
    const val = Number(p.sort_order);
    return !isNaN(val) && val > max ? val : max;
  }, 0);
  return maxSort + 10;
}
