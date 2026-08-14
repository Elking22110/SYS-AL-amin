/**
 * SIS AL AMEEN — ONE CANONICAL PRODUCT MODEL
 * src/utils/productModel.js
 *
 * Defines the single, immutable canonical schema for Product entities,
 * mapping legacy forms and enforcing deterministic version & update protection.
 */

export function toCanonicalProduct(raw = {}) {
  if (!raw) return null;

  const id = String(raw.id || raw.productId || raw._id || '').trim();
  if (!id) return null;

  const nowIso = new Date().toISOString();
  const version = typeof raw.version === 'number' ? raw.version : (parseInt(raw.version || 1, 10) || 1);
  const updatedAt = raw.updated_at || raw.updatedAt || raw.created_at || nowIso;

  // Normalization of cost price vs cost
  const cost = Number(raw.cost !== undefined ? raw.cost : (raw.costPrice !== undefined ? raw.costPrice : 0)) || 0;
  const price = Number(raw.price || 0) || 0;
  const stock = Number(raw.stock || 0) || 0;
  const sortOrder = (raw.sort_order !== undefined && raw.sort_order !== null && !isNaN(Number(raw.sort_order)))
    ? Number(raw.sort_order)
    : ((raw.sortOrder !== undefined && raw.sortOrder !== null && !isNaN(Number(raw.sortOrder))) ? Number(raw.sortOrder) : 0);

  const mainCatId = raw.main_category_id || raw.mainCategoryId || raw.category || null;
  const subCatId  = raw.sub_category_id || raw.subCategoryId || raw.subCategory || null;

  let customColor = raw.customColor || raw.custom_color || '';
  let supplierCode = raw.supplierCode || raw.supplier_code || '';
  let imagePath = raw.image_path || raw.imagePath || '';

  if (typeof imagePath === 'string' && imagePath.startsWith('{')) {
    try {
      const parsed = JSON.parse(imagePath);
      if (parsed.color) customColor = parsed.color;
      if (parsed.code) supplierCode = parsed.code;
      if (parsed.img) imagePath = parsed.img;
    } catch (_) {}
  }

  return {
    id,
    name: String(raw.name || '').trim() || 'منتج غير مسمى',
    barcode: String(raw.barcode || raw.sku || '').trim(),
    price,
    cost,
    costPrice: cost, // backwards compatibility
    stock,
    main_category_id: mainCatId,
    mainCategoryId: mainCatId,
    sub_category_id: subCatId,
    subCategoryId: subCatId,
    category: mainCatId || 'عام',
    image_path: imagePath,
    imagePath: imagePath,
    customColor,
    supplierCode,
    sort_order: sortOrder,
    sortOrder: sortOrder,
    updated_at: updatedAt,
    version,
    deleted_at: raw.deleted_at || raw.deletedAt || null,
    sync_status: raw.sync_status || raw.syncStatus || 'synced',
    sync_state: raw.sync_state || raw.sync_status || 'synced'
  };
}

/**
 * Deterministic Version & Timestamp Comparison
 * Rules:
 * incoming.version > local.version -> APPLY (true)
 * incoming.version == local.version AND same payload -> NO-OP (false)
 * incoming.version < local.version -> IGNORE_STALE (false)
 */
export function isCloudNewerThanLocalProduct(cloudRecord, localRecord) {
  if (!localRecord) return true;
  if (localRecord.sync_status === 'pending') {
    // 🛡️ LOCAL PENDING MUTATION LOCKDOWN: Never overwrite a local pending mutation with an uncommitted cloud snapshot
    return false;
  }

  const cloudVer = typeof cloudRecord.version === 'number' ? cloudRecord.version : parseInt(cloudRecord.version || 0, 10);
  const localVer = typeof localRecord.version === 'number' ? localRecord.version : parseInt(localRecord.version || 0, 10);

  if (!isNaN(cloudVer) && !isNaN(localVer) && cloudVer > 0 && localVer > 0) {
    if (cloudVer !== localVer) {
      return cloudVer > localVer;
    }
  }

  const cloudTime = new Date(cloudRecord.updated_at || 0).getTime();
  const localTime = new Date(localRecord.updated_at || 0).getTime();

  const validCloudTime = isNaN(cloudTime) ? 0 : cloudTime;
  const validLocalTime = isNaN(localTime) ? 0 : localTime;

  if (validCloudTime !== validLocalTime) {
    return validCloudTime > validLocalTime;
  }

  // Same version & timestamp: check payload diff
  if (
    cloudRecord.name !== localRecord.name ||
    Number(cloudRecord.price || 0) !== Number(localRecord.price || 0) ||
    Number(cloudRecord.cost || cloudRecord.costPrice || 0) !== Number(localRecord.cost || localRecord.costPrice || 0) ||
    Number(cloudRecord.stock || 0) !== Number(localRecord.stock || 0) ||
    Number(cloudRecord.sort_order || 0) !== Number(localRecord.sort_order || 0) ||
    (cloudRecord.barcode || null) !== (localRecord.barcode || null)
  ) {
    return true;
  }

  return false;
}

/**
 * Snapshot Validation Rule
 * A snapshot is VALID only if request succeeded, pagination complete, all pages fetched, IDs unique, no network/transport error.
 */
export function validateCloudSnapshot(snapshotInfo = {}) {
  const {
    requestSucceeded = true,
    authValid = true,
    paginationComplete = true,
    networkError = false,
    timeoutError = false,
    fetchedUniqueCount = 0,
    expectedCount = null
  } = snapshotInfo;

  if (!requestSucceeded || !authValid || !paginationComplete || networkError || timeoutError) {
    return { valid: false, reason: 'TRANSPORT_OR_PAGINATION_ERROR' };
  }

  if (expectedCount !== null && expectedCount > 0 && fetchedUniqueCount < expectedCount) {
    return { valid: false, reason: 'COUNT_MISMATCH_INCOMPLETE_PAGINATION' };
  }

  return { valid: true, reason: 'OK' };
}
