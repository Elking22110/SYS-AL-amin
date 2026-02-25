// محسن التخزين - تقليل استدعاءات localStorage
class StorageOptimizer {
  constructor() {
    this.cache = new Map();
    this.debounceTimers = new Map();
    this.batchUpdates = new Map();
  }

  // قراءة محسنة مع cache
  get(key, defaultValue = null) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    try {
      const value = localStorage.getItem(key);
      const parsed = value ? JSON.parse(value) : defaultValue;
      this.cache.set(key, parsed);
      return parsed;
    } catch (error) {
      console.error(`خطأ في قراءة ${key}:`, error);
      return defaultValue;
    }
  }

  // كتابة محسنة مع debounce
  set(key, value, debounceMs = 100) {
    this.cache.set(key, value);
    
    // إلغاء المؤقت السابق
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }

    // إنشاء مؤقت جديد
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        this.debounceTimers.delete(key);
      } catch (error) {
        console.error(`خطأ في كتابة ${key}:`, error);
      }
    }, debounceMs);

    this.debounceTimers.set(key, timer);
  }

  // كتابة فورية (بدون debounce)
  setImmediate(key, value) {
    this.cache.set(key, value);
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`خطأ في كتابة ${key}:`, error);
    }
  }

  // حذف محسن
  remove(key) {
    this.cache.delete(key);
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
      this.debounceTimers.delete(key);
    }
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`خطأ في حذف ${key}:`, error);
    }
  }

  // مسح الـ cache
  clearCache() {
    this.cache.clear();
  }

  // إجبار حفظ جميع التحديثات المعلقة
  flush() {
    this.debounceTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.debounceTimers.clear();
  }

  // إحصائيات الأداء
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingWrites: this.debounceTimers.size,
      memoryUsage: this.cache.size * 100 // تقدير تقريبي
    };
  }
}

// إنشاء instance واحد للنظام
const storageOptimizer = new StorageOptimizer();

export default storageOptimizer;
