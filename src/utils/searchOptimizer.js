// نظام البحث المحسن مع فهرسة ذكية
class SearchOptimizer {
  constructor() {
    this.index = new Map();
    this.cache = new Map();
    this.debounceTimers = new Map();
    this.isIndexing = false;
  }

  // إنشاء فهرس للبيانات
  createIndex(data, fields = ['name', 'description', 'sku', 'barcode']) {
    if (this.isIndexing) return;
    
    this.isIndexing = true;
    this.index.clear();
    
    try {
      data.forEach((item, index) => {
        fields.forEach(field => {
          if (item[field]) {
            const value = item[field].toString().toLowerCase();
            const words = value.split(/\s+/);
            
            words.forEach(word => {
              if (word.length > 1) { // تجاهل الكلمات القصيرة
                if (!this.index.has(word)) {
                  this.index.set(word, new Set());
                }
                this.index.get(word).add(index);
              }
            });
          }
        });
      });
      
      console.log(`✅ تم إنشاء فهرس للبحث: ${this.index.size} كلمة مفتاحية`);
    } catch (error) {
      console.error('خطأ في إنشاء فهرس البحث:', error);
    } finally {
      this.isIndexing = false;
    }
  }

  // البحث المحسن مع debounce
  search(query, data, fields = ['name', 'description', 'sku', 'barcode'], debounceMs = 300) {
    return new Promise((resolve) => {
      // إلغاء البحث السابق
      if (this.debounceTimers.has('search')) {
        clearTimeout(this.debounceTimers.get('search'));
      }

      // إنشاء مؤقت جديد
      const timer = setTimeout(() => {
        const results = this.performSearch(query, data, fields);
        this.debounceTimers.delete('search');
        resolve(results);
      }, debounceMs);

      this.debounceTimers.set('search', timer);
    });
  }

  // تنفيذ البحث
  performSearch(query, data, fields) {
    if (!query || query.trim().length < 2) {
      return data;
    }

    const searchTerm = query.toLowerCase().trim();
    const words = searchTerm.split(/\s+/);
    
    // البحث في الكاش أولاً
    const cacheKey = `${searchTerm}_${data.length}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    let results = new Set();
    
    // البحث باستخدام الفهرس
    if (this.index.size > 0) {
      words.forEach(word => {
        if (this.index.has(word)) {
          this.index.get(word).forEach(index => {
            results.add(index);
          });
        }
      });
    } else {
      // البحث المباشر إذا لم يكن هناك فهرس
      data.forEach((item, index) => {
        const matches = fields.some(field => {
          if (item[field]) {
            return item[field].toString().toLowerCase().includes(searchTerm);
          }
          return false;
        });
        
        if (matches) {
          results.add(index);
        }
      });
    }

    // تحويل النتائج إلى مصفوفة
    const resultArray = Array.from(results).map(index => data[index]);
    
    // حفظ في الكاش
    this.cache.set(cacheKey, resultArray);
    
    // تنظيف الكاش إذا كان كبيراً
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    return resultArray;
  }

  // البحث المتقدم مع فلترة
  advancedSearch(query, data, filters = {}) {
    let results = this.performSearch(query, data);
    
    // تطبيق الفلاتر
    if (filters.category && filters.category !== 'الكل') {
      results = results.filter(item => item.category === filters.category);
    }
    
    if (filters.minPrice !== undefined) {
      results = results.filter(item => item.price >= filters.minPrice);
    }
    
    if (filters.maxPrice !== undefined) {
      results = results.filter(item => item.price <= filters.maxPrice);
    }
    
    if (filters.inStock !== undefined) {
      results = results.filter(item => 
        filters.inStock ? item.stock > 0 : item.stock <= 0
      );
    }
    
    if (filters.lowStock !== undefined) {
      results = results.filter(item => 
        filters.lowStock ? item.stock <= (item.minStock || 5) : item.stock > (item.minStock || 5)
      );
    }

    return results;
  }

  // البحث الضبابي (Fuzzy Search)
  fuzzySearch(query, data, threshold = 0.6) {
    if (!query || query.length < 2) return data;
    
    const results = [];
    const queryLower = query.toLowerCase();
    
    data.forEach(item => {
      const name = item.name.toLowerCase();
      const similarity = this.calculateSimilarity(queryLower, name);
      
      if (similarity >= threshold) {
        results.push({ ...item, similarity });
      }
    });
    
    // ترتيب النتائج حسب التشابه
    return results.sort((a, b) => b.similarity - a.similarity);
  }

  // حساب التشابه بين النصوص
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  // حساب مسافة Levenshtein
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  // البحث في التواريخ
  searchByDateRange(data, startDate, endDate, dateField = 'date') {
    if (!startDate || !endDate) return data;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return data.filter(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= start && itemDate <= end;
    });
  }

  // البحث في الأرقام
  searchByNumericRange(data, field, min, max) {
    if (min === undefined && max === undefined) return data;
    
    return data.filter(item => {
      const value = parseFloat(item[field]);
      if (isNaN(value)) return false;
      
      if (min !== undefined && value < min) return false;
      if (max !== undefined && value > max) return false;
      
      return true;
    });
  }

  // إحصائيات البحث
  getSearchStats() {
    return {
      indexSize: this.index.size,
      cacheSize: this.cache.size,
      isIndexing: this.isIndexing,
      memoryUsage: (this.index.size + this.cache.size) * 100 // تقدير تقريبي
    };
  }

  // تنظيف البيانات
  cleanup() {
    this.index.clear();
    this.cache.clear();
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }
}

// إنشاء instance واحد للنظام
const searchOptimizer = new SearchOptimizer();

export default searchOptimizer;
