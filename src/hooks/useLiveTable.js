import { useState, useEffect, useCallback } from 'react';
import storageOptimizer from '../utils/storageOptimizer.js';
import { subscribe, EVENTS } from '../utils/observerManager.js';

/**
 * Hook مخصص وموحد لإدارة الحالة التفاعلية اللحظية لأي جدول أو كيان في التطبيق.
 * يستمع لتغييرات الشبكة المحلية، أحداث Supabase Realtime، وأحداث المتصفح لإعادة الجلب الفوري.
 * 
 * @param {string|string[]} tableNames - اسم الجدول أو قائمة بالأسماء المترادفة (مثلاً ['products', 'productCategories'])
 * @param {Function} fetcherFn - دالة جلب البيانات الحالية
 * @param {Array} deps - المتغيرات التابعة لإعادة التهيئة عند تغيرها
 */
export function useLiveTable(tableNames, fetcherFn, deps = []) {
  const [data, setData] = useState(() => {
    try {
      return fetcherFn();
    } catch (_) {
      return null;
    }
  });

  const tables = Array.isArray(tableNames) ? tableNames : [tableNames];

  const reload = useCallback(() => {
    try {
      // إجبار إخلاء التخزين المؤقت للبيانات المعنية
      tables.forEach(t => storageOptimizer.clearCache(t));
      const freshData = fetcherFn();
      setData(freshData);
    } catch (err) {
      console.error(`[useLiveTable] Error reloading tables [${tables.join(', ')}]:`, err);
    }
  }, [JSON.stringify(tables), ...deps]);

  useEffect(() => {
    // 1. التحديث المبدئي عند التثبيت
    reload();

    // 2. مستمع أحداث Realtime القادمة من الأجهزة الأخرى
    const handleRealtime = (e) => {
      const targetTable = e.detail?.table || e.detail?.type;
      if (!targetTable || tables.some(t => t.toLowerCase() === String(targetTable).toLowerCase())) {
        reload();
      }
    };

    // 3. مستمع التغيرات المحلية من النوافذ الأخرى
    const handleStorage = (e) => {
      if (!e.key || tables.some(t => t.toLowerCase() === String(e.key).toLowerCase())) {
        reload();
      }
    };

    // 4. مستمع الأحداث الداخلية في النظام
    const handleDataUpdated = (e) => {
      const targetType = e.detail?.type || e.detail?.table || e.detail?.storeName;
      if (!targetType || tables.some(t => t.toLowerCase() === String(targetType).toLowerCase())) {
        reload();
      }
    };

    window.addEventListener('realtimeDataUpdate', handleRealtime);
    window.addEventListener('dataUpdated', handleDataUpdated);
    window.addEventListener('databaseSyncTrigger', handleDataUpdated);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('productsUpdated', reload);
    window.addEventListener('shiftStarted', reload);
    window.addEventListener('shiftEnded', reload);

    // 5. الاشتراكات عبر ObserverManager
    const unsubs = [];
    const eventMap = {
      products: EVENTS.PRODUCTS_CHANGED,
      categories: EVENTS.CATEGORIES_CHANGED,
      productCategories: EVENTS.CATEGORIES_CHANGED,
      customers: EVENTS.CUSTOMERS_CHANGED,
      sales: EVENTS.INVOICES_CHANGED,
      shifts: EVENTS.SHIFTS_CHANGED,
      active_shift: EVENTS.SHIFTS_CHANGED,
      activeShift: EVENTS.SHIFTS_CHANGED,
      returns: EVENTS.RETURNS_CHANGED,
      users: EVENTS.USERS_CHANGED
    };

    tables.forEach(t => {
      const evt = eventMap[t];
      if (evt) {
        try {
          const unsub = subscribe(evt, reload);
          if (unsub) unsubs.push(unsub);
        } catch (_) {}
      }
    });

    return () => {
      window.removeEventListener('realtimeDataUpdate', handleRealtime);
      window.removeEventListener('dataUpdated', handleDataUpdated);
      window.removeEventListener('databaseSyncTrigger', handleDataUpdated);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('productsUpdated', reload);
      window.removeEventListener('shiftStarted', reload);
      window.removeEventListener('shiftEnded', reload);
      unsubs.forEach(unsub => {
        try { unsub(); } catch (_) {}
      });
    };
  }, [reload]);

  return [data, setData, reload];
}

export default useLiveTable;
