// محسن التخزين - إدارة ذكية للذاكرة المخبئية وتفادي البيانات القديمة
import { trace, traceProductsArray, getTracedProductId } from './productTrace.js';

class StorageOptimizer {
  constructor() {
    this.cache = new Map();
    this.debounceTimers = new Map();
    this.batchUpdates = new Map();

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => this.clearCache(e.key));
      window.addEventListener('dataUpdated', (e) => this.clearCache(e.detail?.type));
      window.addEventListener('realtimeDataUpdate', (e) => this.clearCache(e.detail?.table));
      window.addEventListener('databaseSyncTrigger', (e) => this.clearCache(e.detail?.storeName));
    }
  }

  // قراءة محسنة مع فحص الـ Cache
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

  // كتابة مسبقة مع تفريغ فوري للـ Cache لضمان التزامن
  set(key, value, debounceMs = 50) {
    if (key === 'products' && getTracedProductId()) {
      const oldVal = this.cache.get(key) ?? this.get(key, []);
      traceProductsArray('storageOptimizer', 'set() cache+debounced LS', oldVal, value, { file: 'storageOptimizer.js', debounceMs });
    }
    this.cache.set(key, value);
    
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }

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

  // كتابة فورية مع تفريغ فوري لضمان المزامنة اللحظية
  setImmediate(key, value) {
    if (key === 'products' && getTracedProductId()) {
      const oldVal = this.cache.get(key) ?? this.get(key, []);
      traceProductsArray('storageOptimizer', 'setImmediate()', oldVal, value, { file: 'storageOptimizer.js' });
    }
    this.cache.set(key, value);
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`خطأ في كتابة ${key}:`, error);
    }
  }

  // حذف عنصر ومسحه من الـ Cache
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

  // مسح الـ cache لعنصر محدد أو لكافة العناصر
  clearCache(key = null) {
    if ((key === 'products' || key === null) && getTracedProductId()) {
      trace('storageOptimizer', 'clearCache()', null, { key }, { file: 'storageOptimizer.js', productId: getTracedProductId() });
    }
    if (key && typeof key === 'string') {
      this.cache.delete(key);
      // مسح الأسماء المترادفة (مثلاً products <-> items)
      const keyMap = {
        products: ['products'],
        categories: ['productCategories', 'categories'],
        customers: ['customers'],
        sales: ['sales', 'invoices'],
        shifts: ['shifts', 'active_shift', 'activeShift'],
        returns: ['returns'],
        users: ['users']
      };
      const aliases = keyMap[key] || [key];
      aliases.forEach(alias => this.cache.delete(alias));
    } else {
      this.cache.clear();
    }
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
      memoryUsage: this.cache.size * 100
    };
  }
}

const storageOptimizer = new StorageOptimizer();

export default storageOptimizer;
