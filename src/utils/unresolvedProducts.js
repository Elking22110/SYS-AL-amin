/**
 * Unresolved Products Utility Module
 * Identifies the 6 Smart White products requiring technical code review.
 */

export const UNRESOLVED_PRODUCT_IDS = new Set([
  'sw_131_80',   // بيبة 2×1.5 7سم اسمارت هوم
  'sw_131_101',  // مشترك مسلوب 3×2 بوصه بباب سمارت أبيض
  'sw_131_103',  // جلبه لصق 3بوصه سمارت أبيض
  'sw_131_117',  // كوع 1.5×1.25 بوصه بسن سمارت أبيض
  '20005',       // صليبه 45د 4×3 اسمارت هوم (النسخة الأولى)
  '171923'       // صليبه 45د 4×3 اسمارت هوم (النسخة الثانية)
]);

export function isUnresolvedProduct(product) {
  if (!product) return false;
  if (product.is_unresolved || product.requires_review) return true;
  return UNRESOLVED_PRODUCT_IDS.has(String(product.id));
}
