/**
 * نظام إدارة الإيموجي للمنتجات - MS GROUP
 * يربط بين فئات وتسميات المنتجات وبين الإيموجي المناسب لها
 */
import { getCurrentDate } from './dateUtils.js';

class EmojiManager {
  constructor() {
    this.categoryEmojis = {
      // شنط
      'نايلون بيور': '🛍️',
      'نايلون مميز مطبوع': '🛍️',
      'نايلون عادي مطبوع': '🛍️',
      'مطبوع درجة أولي مميزه': '🛍️',
      'مطبوع درجة أولي عالي': '🛍️',
      'مطبوع درجة أولي هاي': '🛍️',
      'مطبوع كسر بيور': '🛍️',
      'مطبوع بيور 100%': '🛍️',
      'إضافات تصنيع': '➕',

      // رولات
      'لامينيشن': '📜',
      'رولات': '📦',

      // قماش
      'شنط قماش مطبوعة': '👜',
      'قماش': '👜',

      // منتجات عامة
      'منتجات متنوعة': '🛍️',
      'عروض': '🎁',
      'جديد': '✨',
      'مخفض': '🏷️'
    };

    this.keywordEmojis = {
      // كلمات مفتاحية للشنط ورولات المصنع
      'نايلون': '🛍️',
      'بيور': '🛍️',
      'مميز': '⭐',
      'مطبوع': '🎨',
      'عادي': '🛍️',
      'كسر': '🛒',
      'هاي': '🌟',
      'درجة': '💯',
      'أكلاشية': '🖼️',
      'إضافات': '➕',
      'يد خارجية': '👜',
      'خارجي': '👜',
      'كيلو': '⚖️',

      // كلمات مفتاحية أخرى
      'منتجات': '🛍️',
      'جديد': '✨',
      'مخفض': '🏷️',
      'عرض': '🎁'
    };

    this.defaultEmoji = '🛍️';
  }

  // الحصول على إيموجي للمنتج
  getProductEmoji(product) {
    if (!product) return this.defaultEmoji;

    const name = (product.name || '').toLowerCase();
    const category = (product.category || '').toLowerCase();
    const description = (product.description || '').toLowerCase();

    // البحث في الفئات أولاً
    for (const [cat, emoji] of Object.entries(this.categoryEmojis)) {
      if (category.includes(cat.toLowerCase()) || name.includes(cat.toLowerCase())) {
        return emoji;
      }
    }

    // البحث في الكلمات المفتاحية
    for (const [keyword, emoji] of Object.entries(this.keywordEmojis)) {
      if (name.includes(keyword.toLowerCase()) ||
        description.includes(keyword.toLowerCase()) ||
        category.includes(keyword.toLowerCase())) {
        return emoji;
      }
    }

    // البحث في الاسم والوصف
    const searchText = `${name} ${description} ${category}`;

    // البحث عن كلمات محددة
    if (searchText.includes('شنطة') || searchText.includes('شنط')) return '🛍️';
    if (searchText.includes('رول') || searchText.includes('رولات')) return '📜';
    if (searchText.includes('تغليف')) return '📦';
    if (searchText.includes('قماش')) return '👜';
    if (searchText.includes('نايلون') || searchText.includes('بلاستيك')) return '🛍️';
    if (searchText.includes('مطبوع') || searchText.includes('طباعة')) return '🎨';
    if (searchText.includes('لامينيشن')) return '📜';
    if (searchText.includes('جديد') || searchText.includes('new')) return '✨';
    if (searchText.includes('مخفض') || searchText.includes('sale')) return '🏷️';
    if (searchText.includes('عرض') || searchText.includes('offer')) return '🎁';

    // إيموجي افتراضي
    return this.defaultEmoji;
  }

  // الحصول على إيموجي للفئة
  getCategoryEmoji(category) {
    if (!category) return this.defaultEmoji;

    const categoryLower = category.toLowerCase();

    for (const [cat, emoji] of Object.entries(this.categoryEmojis)) {
      if (categoryLower.includes(cat.toLowerCase())) {
        return emoji;
      }
    }

    return this.defaultEmoji;
  }

  // الحصول على جميع الإيموجي المتاحة
  getAllEmojis() {
    return {
      categories: this.categoryEmojis,
      keywords: this.keywordEmojis,
      default: this.defaultEmoji
    };
  }

  // إضافة إيموجي مخصص
  addCustomEmoji(keyword, emoji) {
    this.keywordEmojis[keyword.toLowerCase()] = emoji;
  }

  // إضافة فئة مخصصة
  addCustomCategory(category, emoji) {
    this.categoryEmojis[category.toLowerCase()] = emoji;
  }

  // الحصول على إيموجي عشوائي للعروض
  getRandomOfferEmoji() {
    const offerEmojis = ['🎁', '✨', '🏷️', '💎', '🌟', '🎉', '🎊', '💫'];
    return offerEmojis[Math.floor(Math.random() * offerEmojis.length)];
  }

  // الحصول على إيموجي حسب الموسم
  getSeasonalEmoji() {
    const month = new Date(getCurrentDate()).getMonth();

    if (month >= 2 && month <= 4) { // ربيع
      return '🌸';
    } else if (month >= 5 && month <= 7) { // صيف
      return '☀️';
    } else if (month >= 8 && month <= 10) { // خريف
      return '🍂';
    } else { // شتاء
      return '❄️';
    }
  }
}

// إنشاء مثيل واحد من مدير الإيموجي
const emojiManager = new EmojiManager();

export default emojiManager;

