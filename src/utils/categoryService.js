/**
 * CategoryService – Canonical Single Source of Truth for Category Data
 *
 * Architecture Principles:
 * ─────────────────────────────────────────────────────────────────────
 * 1. ALL category data access MUST go through this service.
 * 2. ALL filtering and lookups use stable `id` values (never name strings).
 * 3. Category names are for DISPLAY ONLY – never for logic or filtering.
 * 4. Every screen (Products, POS, Search, Reports, Invoices) uses this service.
 * 5. Business logic that currently compares names MUST be migrated to ID-based access.
 *
 * Future Architecture (Design-Only – Not Yet Implemented):
 * ─────────────────────────────────────────────────────────────────────
 * • ConflictResolver:  detectConflict(localRecord, cloudRecord) → merge | conflict
 * • AuditTrail:        logOperation({ recordId, entityType, deviceId, userId, operation,
 *                        timestamp, previousVersion, newVersion, syncResult, failureReason })
 * Both modules will integrate into SyncManager and this service as a Phase 2 hardening.
 */

import { sortSubcategories } from './subcategorySorter.js';

// ─────────────────────────────────────────────────────────────────────────────
// Internal cache – invalidated on every category mutation or Realtime event
// ─────────────────────────────────────────────────────────────────────────────
let _cache = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 200; // batch rapid reads within same render cycle

// ─────────────────────────────────────────────────────────────────────────────
// Core data access
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return ALL categories from the canonical localStorage source.
 * Always returns a fresh reference-safe array.
 * @returns {Array<{id: string, name: string, parentId?: string|null}>}
 */
export function getCategories() {
  const now = Date.now();
  if (_cache && (now - _cacheTimestamp) < CACHE_TTL_MS) {
    return _cache;
  }
  try {
    const raw = localStorage.getItem('productCategories');
    _cache = raw ? JSON.parse(raw) : [];
  } catch (_) {
    _cache = [];
  }
  _cacheTimestamp = now;
  return _cache;
}

/**
 * Invalidate the in-memory cache.
 * MUST be called whenever categories are created, updated, deleted, or received via Realtime.
 */
export function invalidateCategoryCache() {
  _cache = null;
  _cacheTimestamp = 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// ID-based lookups (use these everywhere instead of name comparisons)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a single category object by its stable ID.
 * @param {string|number} id
 * @returns {{id:string, name:string, parentId?:string}|null}
 */
export function getCategoryById(id) {
  if (id === null || id === undefined || id === '') return null;
  const sid = String(id);
  return getCategories().find(cat => String(cat.id) === sid) || null;
}

/**
 * Get the DISPLAY name of a category by its ID.
 * Use ONLY for rendering text – NEVER for filtering or logic.
 * @param {string|number} id
 * @returns {string}
 */
export function getCategoryNameById(id) {
  const cat = getCategoryById(id);
  return cat ? (cat.name || '') : '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Hierarchy helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all top-level (main) categories.
 * A main category has no parentId, or parentId is null/undefined/''.
 * @returns {Array}
 */
export function getMainCategories() {
  return getCategories().filter(
    cat => !cat.parentId && cat.parentId !== 0
  );
}

/**
 * Get all subcategories whose parentId matches the given ID.
 * @param {string|number} parentId
 * @returns {Array}
 */
export function getSubcategoriesByParentId(parentId) {
  if (parentId === null || parentId === undefined || parentId === '') return [];
  const pid = String(parentId);
  return getCategories().filter(
    cat => cat.parentId != null && String(cat.parentId) === pid
  );
}

/**
 * Get subcategories sorted by canonical brand + inch-size rules.
 * Wraps sortSubcategories from subcategorySorter – sorting is display logic only.
 * @param {string|number} parentId
 * @returns {Array}
 */
export function getSortedSubcategoriesByParentId(parentId) {
  const subs = getSubcategoriesByParentId(parentId);
  const parent = getCategoryById(parentId);
  const parentName = parent ? (parent.name || '') : '';
  return sortSubcategories(subs, parentName);
}

/**
 * Whether a category has any subcategories.
 * @param {string|number} parentId
 * @returns {boolean}
 */
export function hasSubcategories(parentId) {
  return getSubcategoriesByParentId(parentId).length > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Statistics
// ─────────────────────────────────────────────────────────────────────────────

/** Total category count (main + sub). */
export function getTotalCategoryCount() {
  return getCategories().length;
}

/** Main category count. */
export function getMainCategoryCount() {
  return getMainCategories().length;
}

/**
 * Diagnostic: return a summary object suitable for audit/logging.
 * @returns {{total:number, mainCount:number, subCount:number}}
 */
export function getCategoryAuditSummary() {
  const all = getCategories();
  const main = all.filter(cat => !cat.parentId && cat.parentId !== 0);
  return {
    total: all.length,
    mainCount: main.length,
    subCount: all.length - main.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Default export (object API for convenient destructuring)
// ─────────────────────────────────────────────────────────────────────────────
const categoryService = {
  getCategories,
  invalidateCategoryCache,
  getCategoryById,
  getCategoryNameById,
  getMainCategories,
  getSubcategoriesByParentId,
  getSortedSubcategoriesByParentId,
  hasSubcategories,
  getTotalCategoryCount,
  getMainCategoryCount,
  getCategoryAuditSummary,
};

export default categoryService;
