// نظام مركزي لإدارة جميع المراقبين والأحداث لتجنب التداخل والتحديثات المتكررة
class ObserverManager {
  constructor() {
    this.observers = new Map();
    this.intervals = new Map();
    this.timeouts = new Map();
    this.isInitialized = false;
    this.isEnabled = true;

    // Event Bus System
    this.subscribers = new Map();
    this.broadcastChannel = null;
    this.debounceTimers = new Map();

    // Initialize broadcast channel if supported
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('pos-app-sync');
        this.broadcastChannel.onmessage = (event) => {
          const { topic, payload } = event.data;
          this.notifySubscribers(topic, payload, false); // false = don't rebroadcast
        };
      } catch (e) {
        console.warn('BroadcastChannel not available:', e);
      }
    }

    // Listen to storage events for cross-tab sync
    window.addEventListener('storage', (e) => {
      if (e.key?.startsWith('__evt__:')) {
        const topic = e.key.replace('__evt__:', '');
        if (e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            this.notifySubscribers(topic, data.payload, false);
          } catch (err) {
            console.error('Error parsing storage event:', err);
          }
        }
      }
    });
  }

  // تهيئة النظام
  init() {
    if (this.isInitialized) return;

    console.log('🔧 تهيئة مدير المراقبين...');

    // إيقاف جميع المراقبين نهائياً لتجنب المشاكل
    this.stopAll();
    this.isInitialized = true;
    console.log('✅ تم إيقاف جميع المراقبين بنجاح');
  }

  // إعداد مراقب واحد فقط لجميع العمليات
  setupSingleObserver() {
    if (!this.isEnabled) return;

    // مراقب واحد للعناصر المرئية
    const intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.handleElementVisible(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    // مراقب واحد للتغييرات
    const mutationObserver = new MutationObserver((mutations) => {
      // تجميع جميع العقد الجديدة
      const newNodes = new Set();

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            newNodes.add(node);
          }
        });
      });

      // معالجة العقد الجديدة مرة واحدة فقط
      if (newNodes.size > 0) {
        this.handleNewElements(Array.from(newNodes), intersectionObserver);
      }
    });

    // حفظ المراقبين
    this.observers.set('intersection', intersectionObserver);
    this.observers.set('mutation', mutationObserver);

    // بدء المراقبة
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });

    // مراقبة العناصر الموجودة
    this.observeExistingElements(intersectionObserver);
  }

  // معالجة ظهور العنصر
  handleElementVisible(element) {
    // تجنب المعالجة المتكررة
    if (element.dataset.observerProcessed) return;
    element.dataset.observerProcessed = 'true';

    // معالجة الأنيميشن
    if (element.dataset.animation && !element.classList.contains('animation-applied')) {
      element.classList.add(`animate-${element.dataset.animation}`);
      element.classList.add('animation-applied');
    }

    // معالجة الصور الكسولة
    if (element.tagName === 'IMG' && element.dataset.src && !element.dataset.lazyLoaded) {
      element.src = element.dataset.src;
      element.classList.remove('lazy');
      element.dataset.lazyLoaded = 'true';
    }

    // إلغاء مراقبة العنصر
    const intersectionObserver = this.observers.get('intersection');
    if (intersectionObserver) {
      intersectionObserver.unobserve(element);
    }
  }

  // معالجة العناصر الجديدة
  handleNewElements(nodes, intersectionObserver) {
    nodes.forEach(node => {
      // تجنب المعالجة المتكررة
      if (node.dataset.observerProcessed) return;

      // العناصر التي تحتاج أنيميشن
      const animatedElements = node.querySelectorAll ?
        node.querySelectorAll('[data-animation]:not(.animation-applied)') : [];

      // الصور الكسولة
      const lazyImages = node.querySelectorAll ?
        node.querySelectorAll('img[data-src]:not([data-lazy-loaded])') : [];

      // العناصر التي تحتاج مراقبة
      const elementsToObserve = [...animatedElements, ...lazyImages];

      if (elementsToObserve.length > 0) {
        elementsToObserve.forEach(element => {
          intersectionObserver.observe(element);
        });
      }
    });
  }

  // مراقبة العناصر الموجودة
  observeExistingElements(intersectionObserver) {
    const existingElements = document.querySelectorAll('[data-animation]:not(.animation-applied), img[data-src]:not([data-lazy-loaded])');
    existingElements.forEach(element => {
      intersectionObserver.observe(element);
    });
  }

  // إيقاف جميع المراقبين
  stopAll() {
    console.log('🛑 إيقاف جميع المراقبين...');

    this.isEnabled = false;

    // إيقاف المراقبين
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers.clear();

    // إيقاف المؤقتات
    this.intervals.forEach(interval => {
      clearInterval(interval);
    });
    this.intervals.clear();

    this.timeouts.forEach(timeout => {
      clearTimeout(timeout);
    });
    this.timeouts.clear();

    console.log('✅ تم إيقاف جميع المراقبين');
  }

  // إعادة تشغيل المراقبين
  restart() {
    console.log('🔄 إعادة تشغيل المراقبين...');

    this.stopAll();
    this.isEnabled = true;
    this.isInitialized = false;

    setTimeout(() => {
      this.init();
    }, 1000);
  }

  // الحصول على حالة المراقبين
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isEnabled: this.isEnabled,
      observersCount: this.observers.size,
      intervalsCount: this.intervals.size,
      timeoutsCount: this.timeouts.size,
      subscribersCount: this.subscribers.size
    };
  }

  // ============ Event Bus Methods ============

  // Subscribe to an event topic
  subscribe(topic, handler) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    this.subscribers.get(topic).add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.subscribers.get(topic);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.subscribers.delete(topic);
        }
      }
    };
  }

  // Unsubscribe from an event topic
  unsubscribe(topic, handler) {
    const handlers = this.subscribers.get(topic);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.subscribers.delete(topic);
      }
    }
  }

  // Publish an event
  publish(topic, payload = {}, options = {}) {
    const { debounce = 0 } = options;

    // Handle debouncing if specified
    if (debounce > 0) {
      if (this.debounceTimers.has(topic)) {
        clearTimeout(this.debounceTimers.get(topic));
      }

      const timer = setTimeout(() => {
        this.debounceTimers.delete(topic);
        this.doPublish(topic, payload);
      }, debounce);

      this.debounceTimers.set(topic, timer);
    } else {
      this.doPublish(topic, payload);
    }
  }

  // Internal publish implementation
  doPublish(topic, payload) {
    // Notify local subscribers
    this.notifySubscribers(topic, payload, true);

    // Broadcast to other tabs/windows
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ topic, payload });
      } catch (e) {
        console.warn('Failed to broadcast message:', e);
      }
    }

    // Fallback to localStorage for cross-tab sync
    try {
      const eventKey = `__evt__:${topic}`;
      const eventData = JSON.stringify({
        payload,
        timestamp: Date.now(),
        origin: window.location.href
      });
      localStorage.setItem(eventKey, eventData);

      // Clean up old event keys after a short delay
      setTimeout(() => {
        localStorage.removeItem(eventKey);
      }, 500);
    } catch (e) {
      console.warn('Failed to sync via localStorage:', e);
    }
  }

  // Notify subscribers
  notifySubscribers(topic, payload, isLocal) {
    const handlers = this.subscribers.get(topic);
    if (handlers && handlers.size > 0) {
      handlers.forEach(handler => {
        try {
          handler(payload, { topic, isLocal });
        } catch (e) {
          console.error(`Error in event handler for ${topic}:`, e);
        }
      });
    }

    // Also notify wildcard subscribers
    const wildcardHandlers = this.subscribers.get('*');
    if (wildcardHandlers && wildcardHandlers.size > 0) {
      wildcardHandlers.forEach(handler => {
        try {
          handler(payload, { topic, isLocal });
        } catch (e) {
          console.error(`Error in wildcard handler for ${topic}:`, e);
        }
      });
    }
  }

  // Clear all subscriptions for a topic
  clearTopic(topic) {
    this.subscribers.delete(topic);
  }

  // Clear all subscriptions
  clearAllSubscriptions() {
    this.subscribers.clear();
  }
}

// إنشاء instance واحد فقط
export const observerManager = new ObserverManager();

// إيقاف جميع المراقبين القدامى وبدء المدير الجديد
window.addEventListener('DOMContentLoaded', () => {
  // إيقاف جميع المراقبين القدامى
  if (window.designManager) {
    window.designManager.cleanup?.();
  }
  if (window.performanceManager) {
    window.performanceManager.cleanup?.();
  }

  // بدء المدير الجديد
  observerManager.init();
});

// تصدير دوال مساعدة
export const observerUtils = {
  stop: () => observerManager.stopAll(),
  restart: () => observerManager.restart(),
  status: () => observerManager.getStatus()
};

// Export Event Bus functions
export const subscribe = (topic, handler) => observerManager.subscribe(topic, handler);
export const unsubscribe = (topic, handler) => observerManager.unsubscribe(topic, handler);
export const publish = (topic, payload, options) => observerManager.publish(topic, payload, options);

// Standard event topics
export const EVENTS = {
  PRODUCTS_CHANGED: 'products:changed',
  CATEGORIES_CHANGED: 'categories:changed',
  CUSTOMERS_CHANGED: 'customers:changed',
  SUPPLIERS_CHANGED: 'suppliers:changed',
  SHIFTS_CHANGED: 'shifts:changed',
  SETTINGS_CHANGED: 'settings:changed',
  POS_CART_CHANGED: 'pos:cart:changed',
  INVOICES_CHANGED: 'invoices:changed',
  USERS_CHANGED: 'users:changed',
  DATA_IMPORTED: 'data:imported',
  DATA_BACKED_UP: 'data:backed_up'
};
