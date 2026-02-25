// نظام تحسين الأداء والذاكرة
class PerformanceManager {
  constructor() {
    this.cache = new Map();
    this.imageCache = new Map();
    this.debounceTimers = new Map();
    this.throttleTimers = new Map();
    this.observers = new Map();
    this.memoryUsage = {
      initial: this.getMemoryUsage(),
      current: this.getMemoryUsage(),
      peak: this.getMemoryUsage()
    };
    
    this.init();
  }

  // تهيئة النظام
  init() {
    // تفعيل جميع الخدمات المحسنة
    this.setupMemoryMonitoring();
    this.setupImageOptimization();
    this.setupLazyLoading();
    this.setupCompression();
  }

  // مراقبة استخدام الذاكرة
  setupMemoryMonitoring() {
    // تأخير بدء المراقبة لتجنب التحديثات المتكررة
    setTimeout(() => {
      this.memoryInterval = setInterval(() => {
        try {
          this.memoryUsage.current = this.getMemoryUsage();
          
          if (this.memoryUsage.current.used > this.memoryUsage.peak.used) {
            this.memoryUsage.peak = this.memoryUsage.current;
          }
          
          // تنظيف الذاكرة إذا تجاوزت الحد المسموح
          if (this.memoryUsage.current.used > 100 * 1024 * 1024) { // 100MB
            this.cleanupMemory();
          }
        } catch (error) {
          console.error('خطأ في مراقبة الذاكرة:', error);
        }
      }, 30000); // كل 30 ثانية
    }, 5000); // تأخير 5 ثوان
  }

  // الحصول على استخدام الذاكرة
  getMemoryUsage() {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
        percentage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
      };
    }
    return { used: 0, total: 0, limit: 0, percentage: 0 };
  }

  // تنظيف الذاكرة
  cleanupMemory() {
    // تنظيف الكاش القديم
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > 300000) { // 5 دقائق
        this.cache.delete(key);
      }
    }

    // تنظيف كاش الصور القديم
    for (const [key, value] of this.imageCache.entries()) {
      if (now - value.timestamp > 600000) { // 10 دقائق
        this.imageCache.delete(key);
      }
    }

    // إجبار garbage collection إذا كان متاحاً
    if (window.gc) {
      window.gc();
    }

    console.log('تم تنظيف الذاكرة');
  }

  // نظام الكاش الذكي
  cache(key, data, ttl = 300000) { // 5 دقائق افتراضياً
    this.cache.set(key, {
      data: this.compressData(data),
      timestamp: Date.now(),
      ttl
    });
  }

  getCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return this.decompressData(cached.data);
  }

  // ضغط البيانات
  compressData(data) {
    try {
      const jsonString = JSON.stringify(data);
      
      // ضغط بسيط باستخدام Base64
      const compressed = btoa(jsonString);
      
      // إذا كان الضغط لا يوفر مساحة، ارجع البيانات الأصلية
      return compressed.length < jsonString.length ? compressed : jsonString;
    } catch (error) {
      console.error('خطأ في ضغط البيانات:', error);
      return data;
    }
  }

  // فك ضغط البيانات
  decompressData(data) {
    try {
      // محاولة فك الضغط
      if (typeof data === 'string' && data.length > 0) {
        try {
          return JSON.parse(atob(data));
        } catch {
          return JSON.parse(data);
        }
      }
      return data;
    } catch (error) {
      console.error('خطأ في فك ضغط البيانات:', error);
      return data;
    }
  }

  // تحسين تحميل الصور
  setupImageOptimization() {
    // مراقب للصور الجديدة
    const imageObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const images = node.querySelectorAll ? node.querySelectorAll('img') : [];
            images.forEach(img => this.optimizeImage(img));
          }
        });
      });
    });

    imageObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // تحسين صورة واحدة
  optimizeImage(img) {
    if (img.dataset.optimized) return;

    const src = img.src;
    if (!src) return;

    // تحقق من الكاش
    const cached = this.imageCache.get(src);
    if (cached) {
      img.src = cached.optimizedSrc;
      img.dataset.optimized = 'true';
      return;
    }

    // تحسين الصورة
    this.createOptimizedImage(src).then(optimizedSrc => {
      this.imageCache.set(src, {
        optimizedSrc,
        timestamp: Date.now()
      });
      
      img.src = optimizedSrc;
      img.dataset.optimized = 'true';
    });
  }

  // إنشاء صورة محسنة
  createOptimizedImage(src) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // حساب الأبعاد المحسنة
        const maxWidth = 800;
        const maxHeight = 600;
        
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // رسم الصورة المحسنة
        ctx.drawImage(img, 0, 0, width, height);
        
        // تحويل إلى base64 مع جودة محسنة
        const optimizedSrc = canvas.toDataURL('image/jpeg', 0.8);
        resolve(optimizedSrc);
      };

      img.onerror = () => resolve(src);
      img.src = src;
    });
  }

  // التحميل الكسول للصور
  setupLazyLoading() {
    if ('IntersectionObserver' in window) {
      // تأخير بدء المراقبة لتجنب التحديثات المتكررة
      setTimeout(() => {
        const lazyImageObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target;
              img.src = img.dataset.src;
              img.classList.remove('lazy');
              lazyImageObserver.unobserve(img);
            }
          });
        });

        // مراقب للصور الجديدة - فقط للصور الجديدة
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE && !node.classList?.contains('lazy-processed')) {
                const lazyImages = node.querySelectorAll ? node.querySelectorAll('img[data-src]:not(.lazy-processed)') : [];
                lazyImages.forEach(img => {
                  img.classList.add('lazy-processed');
                  lazyImageObserver.observe(img);
                });
              }
            });
          });
        });

        // مراقبة فقط العناصر الجديدة المضافة
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: false,
          characterData: false
        });
      }, 2000); // تأخير ثانيتين
    }
  }

  // ضغط البيانات المتقدمة
  setupCompression() {
    // ضغط البيانات الكبيرة قبل الحفظ
    this.compressLargeData = (data) => {
      if (typeof data === 'string' && data.length > 1000) {
        try {
          // استخدام ضغط بسيط
          let compressed = data;
          
          // إزالة المسافات الزائدة
          compressed = compressed.replace(/\s+/g, ' ');
          
          // ضغط JSON
          if (data.startsWith('{') || data.startsWith('[')) {
            const parsed = JSON.parse(data);
            compressed = JSON.stringify(parsed);
          }
          
          return compressed;
        } catch (error) {
          return data;
        }
      }
      return data;
    };
  }

  // Debounce للوظائف
  debounce(func, delay, key = 'default') {
    return (...args) => {
      const timer = this.debounceTimers.get(key);
      if (timer) {
        clearTimeout(timer);
      }
      
      const newTimer = setTimeout(() => {
        func.apply(this, args);
        this.debounceTimers.delete(key);
      }, delay);
      
      this.debounceTimers.set(key, newTimer);
    };
  }

  // Throttle للوظائف
  throttle(func, delay, key = 'default') {
    return (...args) => {
      const timer = this.throttleTimers.get(key);
      if (!timer) {
        func.apply(this, args);
        
        const newTimer = setTimeout(() => {
          this.throttleTimers.delete(key);
        }, delay);
        
        this.throttleTimers.set(key, newTimer);
      }
    };
  }

  // تحسين الاستعلامات
  optimizeQuery(query, data) {
    // تحسين البحث النصي
    if (typeof query === 'string') {
      const optimizedQuery = query.toLowerCase().trim();
      
      return data.filter(item => {
        return Object.values(item).some(value => {
          if (typeof value === 'string') {
            return value.toLowerCase().includes(optimizedQuery);
          }
          return false;
        });
      });
    }

    // تحسين البحث بالشروط
    if (typeof query === 'object') {
      return data.filter(item => {
        return Object.entries(query).every(([key, value]) => {
          return item[key] === value;
        });
      });
    }

    return data;
  }

  // تحسين التصيير
  optimizeRender(component, data) {
    // استخدام React.memo أو useMemo في المكونات
    // تحسين القوائم الطويلة
    if (Array.isArray(data) && data.length > 100) {
      return this.virtualizeList(data);
    }

    return data;
  }

  // تحسين القوائم الطويلة
  virtualizeList(data, itemHeight = 50, containerHeight = 400) {
    const visibleItems = Math.ceil(containerHeight / itemHeight) + 2;
    const startIndex = 0; // سيتم حسابها بناءً على scroll position
    const endIndex = Math.min(startIndex + visibleItems, data.length);

    return {
      items: data.slice(startIndex, endIndex),
      totalHeight: data.length * itemHeight,
      startIndex,
      endIndex
    };
  }

  // تحسين الشبكة
  optimizeNetwork() {
    // ضغط الطلبات
    this.compressRequest = (data) => {
      if (typeof data === 'object') {
        return JSON.stringify(data);
      }
      return data;
    };

    // تخزين مؤقت للطلبات
    this.cacheRequest = (url, data, ttl = 300000) => {
      const key = `request_${url}_${JSON.stringify(data)}`;
      this.cache(key, data, ttl);
    };

    // تحسين الطلبات المتكررة
    this.batchRequests = (requests) => {
      // تجميع الطلبات المتشابهة
      const batched = {};
      
      requests.forEach(request => {
        const key = `${request.method}_${request.url}`;
        if (!batched[key]) {
          batched[key] = [];
        }
        batched[key].push(request);
      });

      return batched;
    };
  }

  // مراقبة الأداء
  measurePerformance(name, fn) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    console.log(`${name} took ${end - start} milliseconds`);
    
    return result;
  }

  // تحسين الذاكرة للمكونات
  optimizeComponent(component) {
    // تنظيف المستمعين
    const cleanup = () => {
      // إزالة event listeners
      // تنظيف timers
      // تنظيف observers
    };

    return {
      component,
      cleanup
    };
  }

  // إحصائيات الأداء
  getPerformanceStats() {
    return {
      memory: this.memoryUsage,
      cache: {
        size: this.cache.size,
        imageCache: this.imageCache.size
      },
      timers: {
        debounce: this.debounceTimers.size,
        throttle: this.throttleTimers.size
      },
      performance: {
        now: performance.now(),
        memory: performance.memory ? {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        } : null
      }
    };
  }

  // تنظيف شامل
  cleanup() {
    // تنظيف الكاش
    this.cache.clear();
    this.imageCache.clear();
    
    // تنظيف المؤقتات
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.throttleTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    this.throttleTimers.clear();
    
    // تنظيف المراقبين
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    
    // تنظيف مراقبة الذاكرة
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }
    
    console.log('تم تنظيف جميع الموارد');
  }
}

// إنشاء instance واحد للأداء
export const performanceManager = new PerformanceManager();

// دوال مساعدة
export const perf = {
  cache: (key, data, ttl) => performanceManager.cache(key, data, ttl),
  getCache: (key) => performanceManager.getCache(key),
  debounce: (func, delay, key) => performanceManager.debounce(func, delay, key),
  throttle: (func, delay, key) => performanceManager.throttle(func, delay, key),
  optimizeQuery: (query, data) => performanceManager.optimizeQuery(query, data),
  measure: (name, fn) => performanceManager.measurePerformance(name, fn),
  stats: () => performanceManager.getPerformanceStats(),
  cleanup: () => performanceManager.cleanup()
};
