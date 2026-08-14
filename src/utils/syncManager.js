import { supabase, isKeysConfigured, supabaseUrl } from './supabaseClient.js';
import databaseManager from './database.js';
import { publish, EVENTS } from './observerManager.js';
import storageOptimizer from './storageOptimizer.js';
import { trace, traceProductObject, traceProductsArray, traceSupabaseResponse, getTracedProductId } from './productTrace.js';
import { invalidateCategoryCache } from './categoryService.js';

class SyncManager {
  constructor() {
    this.status = 'synced'; // 'synced' | 'syncing' | 'error' | 'offline'
    this.listeners = new Set();
    this.syncInProgress = false;
    this.syncQueued = false; // إعادة مزامنة بعد انتهاء الدورة الحالية بدل إسقاط التغييرات
    this.syncIntervalId = null;
    this.realtimeChannel = null;
    this.lastSyncedAt = {}; // لتجنب مزامنة التغييرات الصادرة من نفس الجهاز
    this.projectSwitchChecked = false;

    if (typeof window !== 'undefined') {
      this.status = window.navigator.onLine ? 'synced' : 'offline';
      
      // الاستماع لحالة الشبكة
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
      
      // الاستماع لتعديلات قاعدة البيانات المحلية
      window.addEventListener('databaseSyncTrigger', (e) => {
        if (window.__isCloudSyncing) return;
        this.triggerSync();
      });

      // التحقق من تغيير المشروع وتصفير مؤشرات المزامنة القديمة
      this.projectSwitchPromise = this.checkProjectSwitch().then(() => {
        this.projectSwitchChecked = true;
      });
    } else {
      this.projectSwitchPromise = Promise.resolve();
      this.projectSwitchChecked = true;
    }
  }

  // ─── CANONICAL DELETE TOMBSTONE PROTECTION (TIMESTAMPED) ───
  getDeletedTombstonesMap(storeName) {
    try {
      const key = `deleted_tombstones_ts_${storeName}`;
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
      // Fallback for legacy format
      const legacyKey = `deleted_tombstones_${storeName}`;
      const legacyRaw = localStorage.getItem(legacyKey);
      const legacySet = legacyRaw ? JSON.parse(legacyRaw) : [];
      const map = {};
      const defaultTs = new Date(0).toISOString();
      legacySet.forEach(id => { map[String(id)] = defaultTs; });
      return map;
    } catch (_) {
      return {};
    }
  }

  getDeletedTombstones(storeName) {
    const map = this.getDeletedTombstonesMap(storeName);
    return new Set(Object.keys(map));
  }

  addDeletedTombstone(storeName, id, timestamp) {
    if (id === undefined || id === null || id === '') return;
    try {
      const strId = String(id);
      const ts = timestamp || new Date().toISOString();
      const map = this.getDeletedTombstonesMap(storeName);
      map[strId] = ts;
      const key = `deleted_tombstones_ts_${storeName}`;
      localStorage.setItem(key, JSON.stringify(map));

      const legacyKey = `deleted_tombstones_${storeName}`;
      const set = new Set(Object.keys(map));
      localStorage.setItem(legacyKey, JSON.stringify(Array.from(set)));
    } catch (_) {}
  }

  isRecordTombstoned(storeName, id, recordTimestamp) {
    if (!id) return false;
    const strId = String(id);
    const map = this.getDeletedTombstonesMap(storeName);
    const deletedAt = map[strId];
    if (!deletedAt) return false;

    if (!recordTimestamp) return true;
    const delTime = new Date(deletedAt).getTime();
    const recTime = new Date(recordTimestamp).getTime();

    if (isNaN(delTime) || isNaN(recTime)) return true;
    return delTime >= recTime;
  }

  // التحقق من تغيير المشروع وتصفير مؤشرات المزامنة القديمة لتجنب حذف البيانات المحلية
  async checkProjectSwitch() {
    if (!isKeysConfigured || !supabase) return;
    
    try {
      const currentUrl = supabaseUrl;
      const match = currentUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.(co|net)/i);
      const projectId = match ? match[1] : '';
      
      if (!projectId) return;
      
      const savedProjectId = localStorage.getItem('current_supabase_project_id');
      
      // إذا كانت هذه المرة الأولى، نحفظ المعرف وسنعمل بشكل طبيعي دون تزوير تواريخ التعديل
      if (!savedProjectId) {
        localStorage.setItem('current_supabase_project_id', projectId);
        console.log(`ℹ️ [SyncManager] تهيئة معرف مشروع Supabase لأول مرة: "${projectId}"`);
        return;
      }

      if (savedProjectId !== projectId) {
        console.log(`🔄 [SyncManager] تم اكتشاف تغيير في مشروع Supabase من "${savedProjectId}" إلى "${projectId}". مسح مؤشرات التزامن لإعادة السحب الآمن...`);
        
        // 1. مسح جميع مؤشرات آخر تزامن من localStorage فقط لإجبار إعادة السحب من السحاب دون تزوير البيانات
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.includes('last_sync_')) {
            localStorage.removeItem(key);
          }
        });

        // 2. حفظ معرف المشروع الجديد بدون تعديل تواريخ التعديل (updated_at) أو فرض حالة pending على البيانات المتزامنة
        localStorage.setItem('current_supabase_project_id', projectId);
        console.log(`✅ [SyncManager] اكتملت تهيئة الانتقال للمشروع الجديد بطلب سحب جديد نقي.`);
      }
    } catch (err) {
      console.error('❌ [SyncManager] خطأ أثناء التحقق من تغيير المشروع:', err);
    }
  }

  // تسجيل مستمعي الحالة
  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  // تحديث وإشعار الحالة
  updateStatus(newStatus) {
    this.status = newStatus;
    this.listeners.forEach(listener => listener(newStatus));
  }

  // معالجة تغير الشبكة
  handleNetworkChange(isOnline) {
    if (isOnline) {
      console.log('🌐 شبكة الإنترنت متصلة، تفعيل المزامنة...');
      this.updateStatus('synced');
      this.triggerSync();
    } else {
      console.log('🔌 انقطع الاتصال بالإنترنت، العمل محلياً...');
      this.updateStatus('offline');
    }
  }

  // بدء التزامن التلقائي الدوري (كل 5 ثوانٍ fallback) + Realtime فوري
  startAutoSync() {
    // 1. تفعيل المزامنة الفورية عبر Supabase Realtime (WebSocket)
    this.startRealtimeSync();

    // 2. المزامنة الدورية كـ fallback كل 5 ثوانٍ
    if (this.syncIntervalId) return;
    this.syncIntervalId = setInterval(() => {
      this.triggerSync();
    }, 5000);
    console.log('⏰ تم تفعيل المزامنة الدورية الخلفية (كل 5 ثوانٍ) + Realtime فوري');
  }

  // إيقاف التزامن الدوري والـ Realtime
  stopAutoSync() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
    this.stopRealtimeSync();
  }

  // تفعيل مزامنة Realtime الفورية عبر WebSocket
  startRealtimeSync() {
    if (!isKeysConfigured || !supabase) return;
    if (this.realtimeChannel) return; // منع الاشتراك المزدوج

    try {
      const REALTIME_TABLES = [
        'customers', 'sales', 'shifts', 'returns', 'products', 'categories', 'users',
        'active_shift', 'suppliers', 'supplier_supplies', 'supplier_payments', 'expenses',
        'store_info', 'pos_settings', 'system_settings', 'manufacturing_waste', 'product_images'
      ];

      this.realtimeChannel = supabase
        .channel('pos-realtime-sync')
        .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
          const table = payload.table;
          if (REALTIME_TABLES.includes(table)) {
            console.log(`⚡ [Realtime] تغيير فوري في جدول ${table}:`, payload.eventType);
            this.handleRealtimeChange(payload);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('⚡ [Realtime] متصل - المزامنة الفورية نشطة!');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.warn('⚠️ [Realtime] انقطع الاتصال الفوري، يعتمد على الـ polling');
            this.realtimeChannel = null;
          }
        });
    } catch (err) {
      console.warn('⚠️ [Realtime] تعذر تفعيل المزامنة الفورية:', err);
    }
  }

  // إيقاف الـ Realtime
  stopRealtimeSync() {
    if (this.realtimeChannel && supabase) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  // معالجة تغيير قادم من Supabase Realtime (من جهاز آخر)
  async handleRealtimeChange(payload) {
    window.__bypass_sync_proxy__ = true;
    try {
      const { table, eventType, new: newRecord, old: oldRecord } = payload;
      const INDEXEDDB_TABLES = ['customers', 'sales', 'shifts', 'returns', 'products', 'categories', 'users'];
      const LOCALSTORAGE_TABLES = [
        'active_shift', 'suppliers', 'supplier_supplies', 'supplier_payments',
        'expenses', 'store_info', 'pos_settings', 'system_settings',
        'manufacturing_waste', 'product_images'
      ];

      if (INDEXEDDB_TABLES.includes(table)) {
        // تحديث IndexedDB مباشرة
        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          if (newRecord && newRecord.id) {
            newRecord.id = String(newRecord.id);

            // 🛡️ Timestamp-Aware Tombstone Guard: يتجاهل الأحداث القديمة المحذوفة ولا يعطل الإضافات الجديدة
            const recTime = newRecord.updated_at || newRecord.created_at;
            if (this.isRecordTombstoned(table, newRecord.id, recTime)) {
              console.log(`🛡️ [Realtime] تجاهل حدث ${eventType} لسجل محذوف بشاهد: ${table}/${newRecord.id}`);
              return;
            }

            // فحص إذا كان هناك تعديل محلي معلق لم يُرفع بعد — حماية التعديل المحلي
            const existingLocal = await databaseManager.get(table, newRecord.id);
            if (existingLocal && existingLocal.sync_status === 'pending') {
              console.log(`🛡️ [SyncManager] حماية التعديل المحلي المعلق من الاستبدال بـ Realtime: ${table}/${newRecord.id}`);
              if (table === 'products') {
                traceProductObject('syncManager', 'handleRealtimeChange() SKIPPED pending', existingLocal, newRecord, { file: 'syncManager.js', fn: 'handleRealtimeChange', eventType });
              }
              return;
            }

            const localRecord = this.mapCloudToLocal(table, newRecord);
            localRecord.sync_status = 'synced';
            if (table === 'products') {
              traceProductObject('syncManager', 'handleRealtimeChange() OVERWRITE', existingLocal, localRecord, { file: 'syncManager.js', fn: 'handleRealtimeChange', eventType });
            }
            await this.reconcileUniqueIndexConflicts(table, localRecord);
            await databaseManager.update(table, localRecord);
          }
        } else if (eventType === 'DELETE') {
          const targetId = String(oldRecord?.id || newRecord?.id || payload.old?.id || payload.new?.id || '');
          if (targetId) {
            const delTime = payload.commit_timestamp || new Date().toISOString();
            this.addDeletedTombstone(table, targetId, delTime);
            await databaseManager.deletePhysical(table, targetId);
            console.log(`🗑️ [Realtime] تم حذف السجل نهائياً وتسجيل الشاهد: ${table}/${targetId}`);
          }
        }

        // تفريغ ذاكرة الـ cache وإشعار كافة المكونات بالتغيير الفوري
        storageOptimizer.clearCache(table);
        const keyMap = { categories: 'productCategories', products: 'products', customers: 'customers', sales: 'sales', shifts: 'shifts', returns: 'returns', users: 'users' };
        const lsKey = keyMap[table];
        if (lsKey) storageOptimizer.clearCache(lsKey);

        const eventMap = { categories: EVENTS.CATEGORIES_CHANGED, products: EVENTS.PRODUCTS_CHANGED, customers: EVENTS.CUSTOMERS_CHANGED, sales: EVENTS.INVOICES_CHANGED, shifts: EVENTS.SHIFTS_CHANGED, returns: EVENTS.RETURNS_CHANGED, users: EVENTS.USERS_CHANGED };
        
        if (lsKey) {
          if (!this._realtimeDebounceTimers) this._realtimeDebounceTimers = {};
          if (this._realtimeDebounceTimers[table]) {
            clearTimeout(this._realtimeDebounceTimers[table]);
          }
          this._realtimeDebounceTimers[table] = setTimeout(async () => {
            try {
              const allItems = await databaseManager.getAll(table);
              window.__bypass_sync_proxy__ = true;
              localStorage.setItem(lsKey, JSON.stringify(allItems || []));
              window.__bypass_sync_proxy__ = false;

              window.dispatchEvent(new CustomEvent('realtimeDataUpdate', { detail: { table, eventType, record: newRecord || oldRecord } }));
              window.dispatchEvent(new CustomEvent('dataUpdated', { detail: { type: table, eventType } }));

              const eventName = eventMap[table];
              if (eventName) {
                try { publish(eventName, { type: eventType.toLowerCase(), table }); } catch (_) {}
              }
              // إبطال cache الـ categoryService عند أي حدث Realtime على جدول categories
              if (table === 'categories') {
                try { invalidateCategoryCache(); } catch (_) {}
              }
            } catch (_) {}
          }, 150);
        }

      } else if (LOCALSTORAGE_TABLES.includes(table)) {
        // تحديث localStorage مباشرة
        const lsKeyMap = { 
          active_shift: 'activeShift', 
          suppliers: 'suppliers',
          supplier_supplies: 'supplier_supplies',
          supplier_payments: 'supplier_payments',
          expenses: 'expenses',
          store_info: 'storeInfo',
          pos_settings: 'pos-settings',
          system_settings: 'system-settings',
          manufacturing_waste: 'manufacturing_waste',
          product_images: 'productImages'
        };
        const lsKey = lsKeyMap[table];
        if (lsKey) {
          const isSingleObj = ['storeInfo', 'pos-settings', 'system-settings', 'activeShift', 'productImages'].includes(lsKey);
          
          if (isSingleObj) {
            if (eventType !== 'DELETE' && newRecord) {
              let targetValue = newRecord.value || newRecord;
              
              if (lsKey === 'activeShift') {
                if (targetValue.originalShiftId) {
                  targetValue = { ...targetValue, id: targetValue.originalShiftId };
                  delete targetValue.originalShiftId;
                }
                
                const oldShiftStr = localStorage.getItem('activeShift');
                const oldShift = oldShiftStr ? JSON.parse(oldShiftStr) : null;
                const wasActive = oldShift && oldShift.status === 'active';
                const isActiveNow = targetValue && targetValue.status === 'active';
                
                localStorage.setItem(lsKey, JSON.stringify(targetValue));
                
                // Publish UI state events
                if (!wasActive && isActiveNow) {
                  console.log('⚡ [Realtime] Shift started on another device, notifying UI:', targetValue.id);
                  try { publish(EVENTS.SHIFTS_CHANGED, { type: 'start', shift: targetValue }); } catch (_) {}
                  try { window.dispatchEvent(new CustomEvent('shiftStarted', { detail: { shiftId: targetValue.id } })); } catch (_) {}
                } else if (wasActive && !isActiveNow) {
                  console.log('⚡ [Realtime] Shift ended on another device, notifying UI:', oldShift.id);
                  try { publish(EVENTS.SHIFTS_CHANGED, { type: 'end', shift: oldShift }); } catch (_) {}
                  try { window.dispatchEvent(new CustomEvent('shiftEnded', { detail: { shiftId: oldShift.id } })); } catch (_) {}
                } else if (wasActive && isActiveNow && JSON.stringify(oldShift) !== JSON.stringify(targetValue)) {
                  console.log('⚡ [Realtime] Shift updated on another device, notifying UI:', targetValue.id);
                  try { publish(EVENTS.SHIFTS_CHANGED, { type: 'update', shift: targetValue }); } catch (_) {}
                }
              } else {
                if (lsKey === 'productImages' && targetValue.originalImagesId) {
                  targetValue = { ...targetValue, id: targetValue.originalImagesId };
                  delete targetValue.originalImagesId;
                }
                localStorage.setItem(lsKey, JSON.stringify(targetValue));
              }
            }
          } else {
            // معالجة الجداول التي هي عبارة عن مصفوفات في localStorage
            let localArray = [];
            try {
              localArray = JSON.parse(localStorage.getItem(lsKey) || '[]');
            } catch (_) {}
            if (!Array.isArray(localArray)) localArray = [];

            if (eventType === 'DELETE') {
              const idToDelete = String(oldRecord?.id || newRecord?.id);
              localArray = localArray.filter(item => String(item.id) !== idToDelete);
            } else if (newRecord) {
              const mappedItem = {
                id: String(newRecord.id),
                ...(newRecord.value || {})
              };
              const existingIndex = localArray.findIndex(item => String(item.id) === String(mappedItem.id));
              if (existingIndex !== -1) {
                localArray[existingIndex] = { ...localArray[existingIndex], ...mappedItem };
              } else {
                localArray.push(mappedItem);
              }
            }
            localStorage.setItem(lsKey, JSON.stringify(localArray));
          }
          
          window.dispatchEvent(new CustomEvent('dataUpdated', { detail: { type: lsKey } }));
        }
      }
    } finally {
      window.__bypass_sync_proxy__ = false;
    }
  }

  // تحويل بيانات السحابة (snake_case) إلى بيانات محلية (camelCase)
  mapCloudToLocal(table, record) {
    const mapped = { ...record };
    if (table === 'customers') {
      if (record.total_spent !== undefined) { mapped.totalSpent = record.total_spent; delete mapped.total_spent; }
      if (record.last_visit !== undefined) { mapped.lastVisit = record.last_visit; delete mapped.last_visit; }
      if (record.join_date !== undefined) { mapped.joinDate = record.join_date; delete mapped.join_date; }
    } else if (table === 'sales') {
      if (record.shift_id !== undefined) { mapped.shiftId = record.shift_id; delete mapped.shift_id; }
      if (record.customer_id !== undefined) { mapped.customerId = record.customer_id; delete mapped.customer_id; }
      if (record.discount_amount !== undefined) { mapped.discountAmount = record.discount_amount; delete mapped.discount_amount; }
      if (record.tax_amount !== undefined) { mapped.taxAmount = record.tax_amount; delete mapped.tax_amount; }
      if (record.payment_method !== undefined) { mapped.paymentMethod = record.payment_method; delete mapped.payment_method; }
      if (record.payment_status !== undefined) { mapped.paymentStatus = record.payment_status; delete mapped.payment_status; }
      if (record.down_payment !== undefined) {
        const dp = record.down_payment && typeof record.down_payment === 'object' ? { ...record.down_payment } : record.down_payment;
        if (dp && typeof dp === 'object') {
          if (dp._settlements) { mapped.settlements = dp._settlements; delete dp._settlements; }
          if (dp._settlement) { mapped.settlement = dp._settlement; delete dp._settlement; }
        }
        mapped.downPayment = dp;
        delete mapped.down_payment;
      }
    } else if (table === 'shifts') {
      if (record.start_time !== undefined) { mapped.startTime = record.start_time; delete mapped.start_time; }
      if (record.end_time !== undefined) { mapped.endTime = record.end_time; delete mapped.end_time; }
      if (record.sales_details !== undefined) {
        const details = record.sales_details && typeof record.sales_details === 'object' ? { ...record.sales_details } : record.sales_details;
        if (details && Array.isArray(details._invoices)) {
          mapped.sales = details._invoices;
          delete details._invoices;
        }
        mapped.salesDetails = details;
        delete mapped.sales_details;
      }
      if (record.returns_data !== undefined) { mapped.returns = record.returns_data; delete mapped.returns_data; }
      if (record.cashier_username !== undefined) { mapped.cashier = { username: record.cashier_username }; delete mapped.cashier_username; }
      if (record.opening_amount !== undefined) { mapped.cashDrawer = { openingAmount: record.opening_amount, expectedAmount: record.expected_amount || 0, closingAmount: record.closing_amount || 0 }; delete mapped.opening_amount; delete mapped.expected_amount; delete mapped.closing_amount; }
    } else if (table === 'returns') {
      if (record.ref_invoice_id !== undefined) { mapped.refInvoiceId = record.ref_invoice_id; delete mapped.ref_invoice_id; }
      if (record.shift_id !== undefined) { mapped.shiftId = record.shift_id; delete mapped.shift_id; }
    } else if (table === 'categories') {
      if (record.parent_id !== undefined) { mapped.parentId = record.parent_id; delete mapped.parent_id; }
    } else if (table === 'products') {
      if (record.main_category_id !== undefined) { mapped.mainCategoryId = record.main_category_id; delete mapped.main_category_id; }
      if (record.sub_category_id !== undefined) { mapped.subCategoryId = record.sub_category_id; delete mapped.sub_category_id; }
      if (record.cost !== undefined) { mapped.costPrice = record.cost; mapped.cost = record.cost; }
      if (record.wholesale_price !== undefined) { mapped.wholesalePrice = record.wholesale_price; }
      if (record.wholesalePrice !== undefined) { mapped.wholesalePrice = record.wholesalePrice; }
      if (record.image_path !== undefined) {
        mapped.imagePath = record.image_path;
        if (typeof record.image_path === 'string' && record.image_path.startsWith('{')) {
          try {
            const parsed = JSON.parse(record.image_path);
            mapped.customColor = parsed.color || '';
            mapped.supplierCode = parsed.code || '';
            if (parsed.wp !== undefined) {
              mapped.wholesalePrice = parsed.wp;
            }
            if (parsed.so !== undefined && parsed.so !== null) {
              mapped.sort_order = Number(parsed.so);
            }
            mapped.imagePath = parsed.img || '';
          } catch (_) {}
        }
        delete mapped.image_path;
      }
      if (record.sort_order !== undefined && record.sort_order !== null) {
        mapped.sort_order = Number(record.sort_order);
      }
      if (record.custom_color !== undefined) { mapped.customColor = record.custom_color ?? ''; delete mapped.custom_color; }
    } else if (table === 'users') {
      if (record.created_at !== undefined) { mapped.createdAt = record.created_at; delete mapped.created_at; }
      if (record.last_login !== undefined) { mapped.lastLogin = record.last_login; delete mapped.last_login; }
    }
    return mapped;
  }

  // مهلة زمنية لطلبات السحابة حتى لا تعلق المزامنة إلى ما لا نهاية
  withCloudTimeout(promise, ms, label) {
    let timer;
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`cloud timeout: ${label} (${ms}ms)`)), ms);
      })
    ]).finally(() => clearTimeout(timer));
  }

  // تحويل أي صيغة تاريخ (نصية عربية، ISO، كائن Date) إلى نص ISO 8601 صالح لـ PostgreSQL
  // الحل الجذري لمشكلة HTTP 400: الحقول من نوع TIMESTAMP WITH TIME ZONE ترفض النصوص العربية
  toISOTimestamp(value) {
    if (!value) return null;
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value.toISOString();
    }
    if (typeof value === 'string') {
      // إذا كانت بالفعل بصيغة ISO صالحة نعيدها مباشرة
      const direct = new Date(value);
      if (!isNaN(direct.getTime())) return direct.toISOString();
      // تحليل النص العربي مثل: "2026/07/26 - 07:57 م"
      const arabicMatch = value.match(/(\d{4})[/\-](\d{1,2})[/\-](\d{1,2}).*?(\d{1,2}):(\d{2})\s*([صم])?/);
      if (arabicMatch) {
        const [, year, month, day, rawHour, minute, ampm] = arabicMatch;
        let hour = parseInt(rawHour, 10);
        if (ampm === 'م' && hour < 12) hour += 12;
        if (ampm === 'ص' && hour === 12) hour = 0;
        const dt = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hour, parseInt(minute));
        return isNaN(dt.getTime()) ? null : dt.toISOString();
      }
      // تحليل التاريخ فقط مثل: "2026-07-26" أو "2026/07/26"
      const dateOnly = value.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})$/);
      if (dateOnly) {
        const [, year, month, day] = dateOnly;
        const dt = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return isNaN(dt.getTime()) ? null : dt.toISOString();
      }
    }
    return null;
  }

  // مشغل المزامنة الآمن
  async triggerSync() {
    if (this.syncInProgress) {
      this.syncQueued = true;
      return;
    }
    if (!window.navigator.onLine) {
      this.updateStatus('offline');
      return;
    }
    if (!isKeysConfigured) {
      // إذا لم يكن Supabase مهيأ، لا نقوم بأي محاولة اتصال
      return;
    }

    // قفل فوري قبل أي await لمنع سباق المزامنات المتوازية
    this.syncInProgress = true;
    this.updateStatus('syncing');

    try {
      if (!this.projectSwitchChecked && this.projectSwitchPromise) {
        await this.projectSwitchPromise;
      }
      await this.syncAll();
      this.updateStatus('synced');
    } catch (error) {
      console.error('❌ فشل مزامنة البيانات مع السحاب:', error);
      this.updateStatus('error');
    } finally {
      this.syncInProgress = false;
      if (this.syncQueued) {
        this.syncQueued = false;
        setTimeout(() => this.triggerSync(), 1000);
      }
    }
  }

  // المزامنة الفعلية لكافة الجداول ثنائية الاتجاه
  // الأولوية للبيانات التشغيلية (وردية/مبيعات/عملاء) قبل الكتالوج الثقيل حتى لا تعلق الأجهزة
  async syncAll() {
    const priorityStores = ['sales', 'customers', 'shifts', 'returns', 'users'];
    const heavyStores = ['products', 'categories'];
    const priorityLocal = [
      'activeShift',
      'expenses',
      'suppliers',
      'supplier_supplies',
      'supplier_payments'
    ];
    const restLocal = [
      'storeInfo',
      'pos-settings',
      'system-settings',
      'manufacturing_waste',
      'productImages'
    ];

    for (const storeName of priorityStores) {
      try {
        await this.syncStore(storeName);
      } catch (err) {
        console.error(`❌ فشل مزامنة ${storeName} (استمرار لباقي الجداول):`, err);
      }
    }

    for (const storeName of priorityLocal) {
      try {
        await this.syncLocalStorageStore(storeName);
      } catch (err) {
        console.error(`❌ فشل مزامنة ${storeName} (استمرار لباقي الجداول):`, err);
      }
    }

    for (const storeName of heavyStores) {
      try {
        await this.syncStore(storeName);
      } catch (err) {
        console.error(`❌ فشل مزامنة ${storeName} (استمرار لباقي الجداول):`, err);
      }
    }

    for (const storeName of restLocal) {
      try {
        await this.syncLocalStorageStore(storeName);
      } catch (err) {
        console.error(`❌ فشل مزامنة ${storeName} (استمرار لباقي الجداول):`, err);
      }
    }
  }

  /**
   * مصالحة تعارضات المؤشرات الفرعية الفريدة (Unique Index Conflict Reconciliation)
   * تمنع خطأ ConstraintError بحذف المفاتيح القديمة المكررة فيزياءً قبل إجراء store.put()
   */
  async reconcileUniqueIndexConflicts(storeName, record) {
    if (!record || !record.id) return;
    const stringId = String(record.id);

    try {
      if (storeName === 'users') {
        if (record.email && typeof record.email === 'string' && record.email.trim()) {
          const emailMatches = await databaseManager.search('users', 'email', record.email.trim());
          if (Array.isArray(emailMatches)) {
            for (const match of emailMatches) {
              if (match && String(match.id) !== stringId) {
                console.log(`🔄 [SyncManager] مصالحة تعارض البريد للمستخدم: مسح المفتاح القديم ${match.id} لصالح ${stringId}`);
                await databaseManager.deletePhysical('users', String(match.id));
              }
            }
          }
        }
        if (record.username && typeof record.username === 'string' && record.username.trim()) {
          const usernameMatches = await databaseManager.search('users', 'username', record.username.trim());
          if (Array.isArray(usernameMatches)) {
            for (const match of usernameMatches) {
              if (match && String(match.id) !== stringId) {
                console.log(`🔄 [SyncManager] مصالحة تعارض اسم المستخدم: مسح المفتاح القديم ${match.id} لصالح ${stringId}`);
                await databaseManager.deletePhysical('users', String(match.id));
              }
            }
          }
        }
      } else if (storeName === 'customers') {
        if (record.phone && typeof record.phone === 'string' && record.phone.trim()) {
          const phoneMatches = await databaseManager.search('customers', 'phone', record.phone.trim());
          if (Array.isArray(phoneMatches)) {
            for (const match of phoneMatches) {
              if (match && String(match.id) !== stringId) {
                await databaseManager.deletePhysical('customers', String(match.id));
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn(`⚠️ [SyncManager] تعذر إتمام مصالحة المؤشرات الفريدة لـ ${storeName}:`, err);
    }
  }

  // ----------------------------------------------------
  // SINGLE WRITE-AUTHORITY STATE TRANSITIONS
  // ----------------------------------------------------
  async markPending(storeName, item) {
    if (!item) return item;
    const updated = {
      ...item,
      id: String(item.id),
      sync_status: 'pending',
      _isNewLocally: item._isNewLocally !== undefined ? item._isNewLocally : true,
      updated_at: item.updated_at || new Date().toISOString()
    };
    await databaseManager.update(storeName, updated);
    return updated;
  }

  async markSynced(storeName, item) {
    if (!item) return item;
    const updated = {
      ...item,
      id: String(item.id),
      sync_status: 'synced'
    };
    await databaseManager.update(storeName, updated);
    return updated;
  }

  async markDeleted(storeName, itemId) {
    if (!itemId) return;
    await databaseManager.delete(storeName, String(itemId));
  }

  /**
   * دالة دقيقة للمقارنة بين سجل السحاب والسجل المحلي
   * القاعدة الصارمة: مقارنة رقم الإصدار version أولاً، وفي حال التساوي أو عدم وجوده يتم المقارنة بتاريخ التعديل updated_at
   */
  isCloudNewerThanLocal(cloudRecord, localRecord) {
    if (!localRecord) return true;

    // 1. مقارنة رقم الإصدار (version) عند وجوده
    const cloudVer = typeof cloudRecord.version === 'number' ? cloudRecord.version : parseInt(cloudRecord.version || 0, 10);
    const localVer = typeof localRecord.version === 'number' ? localRecord.version : parseInt(localRecord.version || 0, 10);

    if (!isNaN(cloudVer) && !isNaN(localVer) && cloudVer > 0 && localVer > 0) {
      if (cloudVer !== localVer) {
        return cloudVer > localVer;
      }
    }

    // 2. التراجع للتاريخ updated_at عند غياب أو تباين الاصدارات
    const cloudTime = new Date(cloudRecord.updated_at || 0).getTime();
    const localTime = new Date(localRecord.updated_at || 0).getTime();

    const validCloudTime = isNaN(cloudTime) ? 0 : cloudTime;
    const validLocalTime = isNaN(localTime) ? 0 : localTime;

    if (validCloudTime !== validLocalTime) {
      return validCloudTime > validLocalTime;
    }

    // 3. مطابقة القيم الحسابية والتشغيلية في حالة تساوى التواريخ للبيانات المتزامنة (synced)
    if (localRecord.sync_status === 'synced') {
      const isProduct = localRecord.hasOwnProperty('price') || localRecord.hasOwnProperty('costPrice') || cloudRecord.hasOwnProperty('price');
      if (isProduct) {
        const cloudLocal = this.mapCloudToLocal('products', cloudRecord);
        if (
          cloudLocal.name !== localRecord.name ||
          Number(cloudLocal.price || 0) !== Number(localRecord.price || 0) ||
          Number(cloudLocal.costPrice || 0) !== Number(localRecord.costPrice || 0) ||
          Number(cloudLocal.stock || 0) !== Number(localRecord.stock || 0) ||
          Number(cloudLocal.sort_order || 0) !== Number(localRecord.sort_order || 0) ||
          (cloudLocal.barcode || null) !== (localRecord.barcode || null) ||
          (cloudLocal.supplierCode || null) !== (localRecord.supplierCode || null) ||
          (cloudLocal.customColor || null) !== (localRecord.customColor || null) ||
          (cloudLocal.mainCategoryId || null) !== (localRecord.mainCategoryId || null) ||
          (cloudLocal.subCategoryId || null) !== (localRecord.subCategoryId || null)
        ) {
          return true;
        }
      } else {
        if (cloudRecord.name !== undefined && cloudRecord.name !== localRecord.name) {
          return true;
        }
      }
    }

    return false;
  }

  // مزامنة جدول فردي (Download-First مع Tombstones ومقارنة Version أولاً)
  async syncStore(storeName) {
    const traceId = getTracedProductId();
    if (storeName === 'products' && traceId) {
      trace('syncManager', 'syncStore() START (Download-First)', null, null, { productId: traceId, file: 'syncManager.js', fn: 'syncStore' });
    }

    try {
      // ----------------------------------------------------
      // 1. استيراد وتحديث البيانات المعدلة في السحاب أولاً (Download-First)
      // ----------------------------------------------------
      let localRecords = await databaseManager.getAllForSync(storeName);
      let localIdMap = new Map(localRecords.map(r => [String(r.id), r]));
      let deletedIdsSet = new Set(localRecords.filter(r => r && r.sync_status === 'synced' ? false : r && r.sync_status === 'deleted').map(r => String(r.id)));

      const syncedRecords = localRecords.filter(r => r && r.sync_status === 'synced');
      let lastLocalUpdate = new Date(0).toISOString();
      if (syncedRecords.length > 0) {
        const times = syncedRecords.map(r => {
          const t = new Date(r.updated_at || 0).getTime();
          return isNaN(t) ? 0 : t;
        });
        lastLocalUpdate = new Date(Math.max(...times)).toISOString();
      }

      // جداول السحب الكامل: كل سجل محلي متزامن (synced) غائب عن السحاب يُحذف بضمانات صارمة (منع Zombie Resurrection)
      const FULL_PULL_TABLES = new Set(['customers', 'sales', 'shifts', 'returns', 'users', 'categories', 'products']);
      const useFullPull = FULL_PULL_TABLES.has(storeName);

      let cloudUpdates = [];
      let allCloudIdsSet = new Set();
      let hasMore = true;
      let hasChanges = false;

      if (useFullPull) {
        let fullPullOffset = 0;
        const fullPullPageSize = 1000;
        while (hasMore) {
          const { data, error: fetchError } = await supabase
            .from(storeName)
            .select('*')
            .order('updated_at', { ascending: true })
            .range(fullPullOffset, fullPullOffset + fullPullPageSize - 1);

          if (fetchError) throw fetchError;
          if (data && data.length > 0) {
            for (const cloudItem of data) {
              const cId = String(cloudItem.id ?? '');
              allCloudIdsSet.add(cId);
              if (deletedIdsSet.has(cId)) continue; // تخطي المحذوفات بشواهد محلية

              const local = localIdMap.get(cId);
              if (!local || this.isCloudNewerThanLocal(cloudItem, local)) {
                cloudUpdates.push(cloudItem);
              }
            }
            fullPullOffset += data.length;
            hasMore = data.length === fullPullPageSize;
          } else {
            hasMore = false;
          }
        }

        // ═══ منع Zombie Resurrection: حذف آمن بضمانات ستة كاملة ═══
        // يتم حذف سجل محلي فقط إذا تحققت جميع الشروط:
        // 1. غير موجود في نتائج السحب الكامل من السحاب
        // 2. sync_status === 'synced' (ليس pending وليس deleted)
        // 3. السحاب أعاد بيانات حقيقية (allCloudIdsSet.size > 0) لتجنب وهم إيجابي
        if (allCloudIdsSet.size > 0) {
          for (const localRecord of localRecords) {
            const localId = String(localRecord.id);
            const isCloudPresent = allCloudIdsSet.has(localId);
            if (!isCloudPresent) {
              const recTime = localRecord.created_at || localRecord.updated_at;
              const isTombstone = this.isRecordTombstoned(storeName, localId, recTime) || localRecord.sync_status === 'deleted';
              const isStaleSynced = localRecord.sync_status === 'synced';

              // 🛡️ CRITICAL RULE: السجلات المعلقة pending (إضافة جديدة أو تعديل) لا تُحذف إطلاقاً في الخطوة 1
              // يجب إعطاؤها الفرصة للرفع في الخطوة 2 (Upload-Second)
              if (isTombstone || isStaleSynced) {
                console.log(`🧹 [SyncManager] Zombie Prevention | Store: ${storeName} | ID: ${localId} | حذف سجل محلي قديم غائب من السحاب (${allCloudIdsSet.size} سجل سحاب متحقق)`);
                this.addDeletedTombstone(storeName, localId);
                await databaseManager.deletePhysical(storeName, localId);
                hasChanges = true;
              }
            }
          }
        }
      } else {
        // سحب تدريجي للجداول الكبيرة (مثل المنتجات): نعتمد هامش أمان زماني ولا نعتمد على lastLocalUpdate فقط
        let lastFetchedTime = lastLocalUpdate;
        if (lastLocalUpdate && lastLocalUpdate !== new Date(0).toISOString()) {
          try {
            const ms = new Date(lastLocalUpdate).getTime();
            if (!isNaN(ms)) lastFetchedTime = new Date(Math.max(0, ms - 60000)).toISOString(); // 1 minute overlap safety margin
          } catch (_) {}
        }
        const pageSize = 1000;
        while (hasMore) {
          const { data, error: fetchError } = await supabase
            .from(storeName)
            .select('*')
            .gt('updated_at', lastFetchedTime)
            .order('updated_at', { ascending: true })
            .limit(pageSize);

          if (fetchError) throw fetchError;
          if (data && data.length > 0) {
            for (const cloudItem of data) {
              const cId = String(cloudItem.id ?? '');
              if (deletedIdsSet.has(cId)) continue;

              const local = localIdMap.get(cId);
              if (!local || this.isCloudNewerThanLocal(cloudItem, local)) {
                cloudUpdates.push(cloudItem);
              }
            }
            if (data.length < pageSize) {
              hasMore = false;
            } else {
              lastFetchedTime = data[data.length - 1].updated_at;
            }
          } else {
            hasMore = false;
          }
        }
      }

      // حفظ السجلات السحابية الأحدث في IndexedDB
      if (cloudUpdates.length > 0) {
        console.log(`📥 [SyncManager] تم تحميل ${cloudUpdates.length} تحديثاً سحابياً لجدول ${storeName}`);
        hasChanges = true;
        
        for (const cloudItem of cloudUpdates) {
          if (cloudItem.id !== undefined && cloudItem.id !== null) {
            cloudItem.id = String(cloudItem.id);
          }

          if (deletedIdsSet.has(cloudItem.id)) continue;

          const existingLocal = await databaseManager.get(storeName, cloudItem.id);
          
          // حماية التعديل المحلي المعلق للمستخدم فقط إذا كان إصداره/تاريخه المحلي أحدث من السحاب
          if (existingLocal && existingLocal.sync_status === 'pending' && !this.isCloudNewerThanLocal(cloudItem, existingLocal)) {
            console.log(`🛡️ [SyncManager] حفظ التعديل المحلي المعلق الأكثر حداثة لـ ${storeName}/${cloudItem.id}`);
            continue;
          }
          
          const localItem = this.mapCloudToLocal(storeName, cloudItem);
          localItem.sync_status = 'synced';
          await this.reconcileUniqueIndexConflicts(storeName, localItem);
          await databaseManager.update(storeName, localItem);
        }
      }

      // تحديث LocalStorage من IndexedDB للحفاظ على تزامن واجهة المستخدم عند حدوث أي تعديل أو حذف
      if (hasChanges) {
        try {
          const allItems = await databaseManager.getAll(storeName);
          const keyMap = {
            'categories': 'productCategories',
            'products': 'products',
            'customers': 'customers',
            'sales': 'sales',
            'shifts': 'shifts',
            'returns': 'returns',
            'users': 'users'
          };
          const localStorageKey = keyMap[storeName];
          if (localStorageKey) {
            window.__bypass_sync_proxy__ = true;
            localStorage.setItem(localStorageKey, JSON.stringify(allItems || []));
            window.__bypass_sync_proxy__ = false;
            
            const eventMap = {
              'categories': EVENTS.CATEGORIES_CHANGED,
              'products': EVENTS.PRODUCTS_CHANGED,
              'customers': EVENTS.CUSTOMERS_CHANGED,
              'sales': EVENTS.INVOICES_CHANGED,
              'shifts': EVENTS.SHIFTS_CHANGED,
              'returns': EVENTS.RETURNS_CHANGED,
              'users': EVENTS.USERS_CHANGED
            };
            const eventName = eventMap[storeName];
            if (eventName) {
              publish(eventName, { type: 'import', storeName });
            }
            // إبطال cache الـ categoryService عند تحديث بيانات الأصناف لضمان تزامن جميع الشاشات
            if (storeName === 'categories') {
              invalidateCategoryCache();
            }
          }
        } catch (err) {
          console.error(`[SyncManager] Failed to update localStorage for ${storeName}:`, err);
        }

        window.dispatchEvent(new CustomEvent('dataUpdated', { detail: { type: storeName } }));
      }

      // ----------------------------------------------------
      // 2. تصوير البيانات المعلقة وشواهد الحذف محلياً ورفعها إلى السحاب (Upload-Second)
      // ----------------------------------------------------
      localRecords = await databaseManager.getAllForSync(storeName);
      const pendingRecords = localRecords.filter(r => r && r.sync_status === 'pending');
      const deletedRecords = localRecords.filter(r => r && r.sync_status === 'deleted');

      // رفع الإضافات والتعديلات على شكل دفعات (Batches)
      if (pendingRecords.length > 0) {
        const batchData = [];
        const originalRecordsMap = new Map();

        for (const record of pendingRecords) {
          const recordId = String(record.id);
          const recTime = record.created_at || record.updated_at;
          const isTombstoned = this.isRecordTombstoned(storeName, recordId, recTime);
          if (
            isTombstoned ||
            (useFullPull && allCloudIdsSet.size > 0 && !allCloudIdsSet.has(recordId) && !record._isNewLocally)
          ) {
            console.log(`🛡️ [SyncManager] Pre-Upload Guard REJECTED stale pending write for deleted record: ${storeName}/${recordId}`);
            this.addDeletedTombstone(storeName, recordId);
            await databaseManager.deletePhysical(storeName, recordId);
            continue;
          }

          record.updated_at = record.updated_at || new Date().toISOString();
          const { sync_status, ...uploadData } = record;
          uploadData.id = recordId;
          
          if (storeName === 'categories') {
            uploadData.parent_id = record.parentId;
            delete uploadData.parentId;
            delete uploadData.description;
            const cat = {
              id: String(record.id),
              name: uploadData.name,
              parent_id: uploadData.parent_id ?? null,
              updated_at: uploadData.updated_at || new Date().toISOString()
            };
            Object.keys(uploadData).forEach(k => delete uploadData[k]);
            Object.assign(uploadData, cat);
          } else if (storeName === 'products') {
            uploadData.main_category_id = record.mainCategoryId;
            uploadData.sub_category_id = record.subCategoryId;
            uploadData.image_path = record.imagePath;
            delete uploadData.mainCategoryId;
            delete uploadData.subCategoryId;
            delete uploadData.imagePath;
            delete uploadData.minStock;
            delete uploadData.category;
            delete uploadData.customColor;
            delete uploadData.supplierCode;
            delete uploadData.wholesalePrice;
            delete uploadData.wholesale_price;

            let imageVal = record.imagePath || record.image_path || null;
            let currentMeta = (typeof imageVal === 'string' && imageVal.startsWith('{')) ? JSON.parse(imageVal) : { img: imageVal || '' };

            if (record.hasOwnProperty('customColor') || record.hasOwnProperty('supplierCode') || record.hasOwnProperty('wholesalePrice') || record.hasOwnProperty('wholesale_price') || record.hasOwnProperty('sort_order')) {
              const wpVal = record.wholesalePrice ?? record.wholesale_price ?? uploadData.wholesalePrice ?? uploadData.wholesale_price ?? 0;
              const soVal = (record.sort_order !== undefined && record.sort_order !== null) ? Number(record.sort_order) : (currentMeta.so ?? null);
              
              currentMeta = {
                color: record.customColor || currentMeta.color || '',
                code: record.supplierCode || currentMeta.code || '',
                wp: wpVal,
                so: soVal,
                img: (typeof imageVal === 'string' && imageVal.startsWith('{')) ? (JSON.parse(imageVal).img || '') : (imageVal || '')
              };
              imageVal = JSON.stringify(currentMeta);
            }

            const prod = {
              id: String(record.id),
              name: uploadData.name,
              price: uploadData.price ?? 0,
              cost: record.costPrice ?? record.cost ?? uploadData.cost ?? uploadData.costPrice ?? 0,
              stock: uploadData.stock ?? 0,
              barcode: uploadData.barcode ?? null,
              main_category_id: record.mainCategoryId || uploadData.main_category_id || null,
              sub_category_id: record.subCategoryId || uploadData.sub_category_id || null,
              image_path: imageVal,
              updated_at: uploadData.updated_at || new Date().toISOString()
            };
            if (record.version !== undefined) prod.version = record.version;
            Object.keys(uploadData).forEach(k => delete uploadData[k]);
            Object.assign(uploadData, prod);
          } else if (storeName === 'customers') {
            if (record.totalSpent !== undefined) uploadData.total_spent = record.totalSpent;
            if (record.lastVisit !== undefined) uploadData.last_visit = record.lastVisit;
            if (record.joinDate !== undefined) uploadData.join_date = record.joinDate;
            delete uploadData.totalSpent;
            delete uploadData.lastVisit;
            delete uploadData.joinDate;

            const cust = {
              id: String(record.id),
              name: uploadData.name,
              phone: uploadData.phone ?? null,
              email: uploadData.email ?? null,
              status: uploadData.status ?? 'نشط',
              debt: uploadData.debt ?? 0,
              total_spent: uploadData.total_spent ?? 0,
              last_visit: this.toISOTimestamp(uploadData.last_visit),
              join_date: uploadData.join_date ?? null,
              updated_at: uploadData.updated_at || new Date().toISOString()
            };

            if (uploadData.address !== undefined) cust.address = uploadData.address;
            if (uploadData.type !== undefined) cust.type = uploadData.type;

            Object.keys(uploadData).forEach(k => delete uploadData[k]);
            Object.assign(uploadData, cust);
          } else if (storeName === 'sales') {
            uploadData.shift_id = record.shiftId;
            uploadData.customer_id = record.customerId;
            uploadData.discount_amount = record.discountAmount;
            uploadData.tax_amount = record.taxAmount;
            uploadData.payment_method = record.paymentMethod;
            uploadData.payment_status = record.paymentStatus;
            const downPayment = record.downPayment && typeof record.downPayment === 'object' ? { ...record.downPayment } : {};
            if (record.settlements) downPayment._settlements = record.settlements;
            if (record.settlement) downPayment._settlement = record.settlement;
            uploadData.down_payment = downPayment;
            const sale = {
              id: String(record.id),
              date: record.date ?? null,
              timestamp: this.toISOTimestamp(record.timestamp ?? record.date),
              shift_id: uploadData.shift_id ?? null,
              customer_id: uploadData.customer_id ?? null,
              items: record.items ?? [],
              total: record.total ?? 0,
              discount_amount: uploadData.discount_amount ?? 0,
              tax_amount: uploadData.tax_amount ?? 0,
              payment_method: uploadData.payment_method ?? 'cash',
              payment_status: uploadData.payment_status ?? 'complete',
              down_payment: uploadData.down_payment ?? {},
              customer: record.customer ?? {},
              updated_at: uploadData.updated_at || new Date().toISOString()
            };
            Object.keys(uploadData).forEach(k => delete uploadData[k]);
            Object.assign(uploadData, sale);
          } else if (storeName === 'shifts') {
            const details = (record.salesDetails && typeof record.salesDetails === 'object') ? { ...record.salesDetails } : {};
            if (Array.isArray(record.sales) && record.sales.length > 0) {
              details._invoices = record.sales;
            }
            const shiftPayload = {
              id: String(record.id),
              status: record.status || 'completed',
              start_time: record.startTime || null,
              end_time: record.endTime || null,
              opening_amount: record.cashDrawer?.openingAmount || 0,
              expected_amount: record.cashDrawer?.expectedAmount || 0,
              closing_amount: record.closing_amount ?? record.cashDrawer?.closingAmount ?? 0,
              cashier_username: record.cashier?.username || record.cashier || 'unknown',
              sales_details: details,
              returns_data: Array.isArray(record.returns) ? record.returns : [],
              updated_at: uploadData.updated_at || new Date().toISOString()
            };
            Object.keys(uploadData).forEach(k => delete uploadData[k]);
            Object.assign(uploadData, shiftPayload);
          } else if (storeName === 'returns') {
            const ret = {
              id: String(record.id),
              date: record.date ?? null,
              timestamp: this.toISOTimestamp(record.timestamp ?? record.date),
              ref_invoice_id: record.refInvoiceId ?? null,
              shift_id: record.shiftId ?? null,
              customer: record.customer ?? {},
              item: record.item ?? {},
              amount: record.amount ?? 0,
              updated_at: uploadData.updated_at || new Date().toISOString()
            };
            Object.keys(uploadData).forEach(k => delete uploadData[k]);
            Object.assign(uploadData, ret);
          } else if (storeName === 'users') {
            if (record.createdAt !== undefined) { uploadData.created_at = record.createdAt; delete uploadData.createdAt; }
            if (record.lastLogin !== undefined) { uploadData.last_login = record.lastLogin; delete uploadData.lastLogin; }
            delete uploadData.phone;
            const effUser = uploadData.username || uploadData.name || String(record.id);
            if (!effUser || !uploadData.password) {
              try {
                const sysUser = { ...record, sync_status: 'synced' };
                const tx = databaseManager.db.transaction(['users'], 'readwrite');
                tx.objectStore('users').put(sysUser);
              } catch (_) {}
              continue;
            }
            uploadData.username = effUser;
          }

          batchData.push(uploadData);
          originalRecordsMap.set(String(record.id), record);
        }

        const batchSize = 200;
        for (let i = 0; i < batchData.length; i += batchSize) {
          const chunk = batchData.slice(i, i + batchSize);
          let error = null;
          try {
            const result = await this.withCloudTimeout(
              supabase.from(storeName).upsert(chunk),
              20000,
              `upsert ${storeName} x${chunk.length}`
            );
            error = result.error;
          } catch (timeoutErr) {
            error = { message: String(timeoutErr.message || timeoutErr), code: 'TIMEOUT' };
          }
          
          if (error) {
            console.warn(`⚠️ [SyncManager] فشل رفع دفعة لـ ${storeName}:`, {
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint
            });
            if (error.code === 'TIMEOUT') continue;

            for (const uploadItemData of chunk) {
              let singleUploadData = { ...uploadItemData };
              let { error: singleError } = await supabase.from(storeName).upsert(singleUploadData);
              
              if (singleError && singleError.code === 'PGRST204') {
                const safeData = { id: singleUploadData.id, updated_at: singleUploadData.updated_at };
                if (storeName === 'customers') {
                  if (singleUploadData.name) safeData.name = singleUploadData.name;
                  if (singleUploadData.phone) safeData.phone = singleUploadData.phone;
                  if (singleUploadData.email) safeData.email = singleUploadData.email;
                  if (singleUploadData.total_spent !== undefined) safeData.total_spent = singleUploadData.total_spent;
                  if (singleUploadData.last_visit) safeData.last_visit = singleUploadData.last_visit;
                  if (singleUploadData.join_date) safeData.join_date = singleUploadData.join_date;
                } else if (storeName === 'users') {
                  if (singleUploadData.username) safeData.username = singleUploadData.username;
                  if (singleUploadData.email) safeData.email = singleUploadData.email;
                } else {
                  Object.assign(safeData, singleUploadData);
                }
                const { error: retryError } = await supabase.from(storeName).upsert(safeData);
                singleError = retryError;
              }

              if (!singleError) {
                const record = originalRecordsMap.get(String(singleUploadData.id));
                if (record) {
                  record.sync_status = 'synced';
                  const transaction = databaseManager.db.transaction([storeName], 'readwrite');
                  const store = transaction.objectStore(storeName);
                  store.put(record);
                }
              }
            }
          } else {
            const transaction = databaseManager.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            for (const uploadItem of chunk) {
              const record = originalRecordsMap.get(String(uploadItem.id));
              if (record) {
                record.sync_status = 'synced';
                store.put(record);
              }
            }
            console.log(`✅ [SyncManager] تم رفع دفعة من ${chunk.length} سجل بنجاح في جدول ${storeName}`);
          }
        }
      }

      // 3. رفع معالجة شواهد الحذف (Deleted Tombstones) إلى السحاب ومسح الشاهد فيزياءً عند النجاح
      for (const record of deletedRecords) {
        if (!record || !record.id) continue;
        const targetIdStr = String(record.id);
        this.addDeletedTombstone(storeName, targetIdStr);

        if (storeName === 'customers') {
          try {
            await supabase.from('sales').update({ customer_id: null }).eq('customer_id', targetIdStr);
            await supabase.from('returns').update({ customer_id: null }).eq('customer_id', targetIdStr);
          } catch (_) {}
        } else if (storeName === 'categories') {
          try {
            // فك ارتباط المنتجات بالفئة المحذوفة بدلاً من مسح المنتجات لمنع فقدان البيانات
            await supabase.from('products').update({ main_category_id: null }).eq('main_category_id', targetIdStr);
            await supabase.from('products').update({ sub_category_id: null }).eq('sub_category_id', targetIdStr);
            await supabase.from('categories').update({ parent_id: null }).eq('parent_id', targetIdStr);
          } catch (_) {}
        }
        
        console.log(`🗑️ [SyncManager] إرسال طلب حذف شاهد (Tombstone) لسحابة ${storeName}/${targetIdStr}`);
        const { error } = await supabase.from(storeName).delete().eq('id', targetIdStr);
        if (!error || error.code === 'PGRST116') {
          await databaseManager.deletePhysical(storeName, targetIdStr);
          console.log(`✅ [SyncManager] تم تأكيد الحذف ومسح الشاهد فيزياءً لـ ${storeName}/${targetIdStr}`);
        } else {
          console.error(`❌ خطأ في حذف الصنف ${targetIdStr} من سحابة ${storeName}:`, error);
        }
      }

    } catch (e) {
      console.error(`❌ خطأ في مزامنة جدول ${storeName}:`, e);
      throw e;
    }
  }

  // مزامنة جداول الـ LocalStorage ثنائية الاتجاه مع معالجة الإضافات والمحذوفات والتعديلات
  async syncLocalStorageStore(tableName) {
    window.__bypass_sync_proxy__ = true;
    try {
      const tableMap = {
        'storeInfo': 'store_info',
        'pos-settings': 'pos_settings',
        'system-settings': 'system_settings',
        'activeShift': 'active_shift',
        'productImages': 'product_images'
      };
      const dbTableName = tableMap[tableName] || tableName;
      const isSingleObject = ['storeInfo', 'pos-settings', 'system-settings', 'activeShift', 'productImages'].includes(tableName);

      let localData = [];
      let mutated = false;

      if (isSingleObject) {
        const localObj = JSON.parse(localStorage.getItem(tableName) || '{}');
        const configItem = { ...localObj };
        
        // Preserve original business ID for single objects
        if (tableName === 'activeShift') {
          configItem.originalShiftId = localObj.id;
        } else if (tableName === 'productImages') {
          configItem.originalImagesId = localObj.id;
        }
        
        configItem.id = 'config';
        
        if (!configItem.updated_at) {
          if (tableName === 'activeShift') {
            const hasActiveLocal = Boolean(localObj && localObj.id && localObj.status === 'active');
            configItem.updated_at = hasActiveLocal ? new Date().toISOString() : new Date(0).toISOString();
            if (hasActiveLocal) mutated = true;
          } else {
            configItem.updated_at = new Date().toISOString();
            mutated = true;
          }
        }
        localData = [configItem];
        if (mutated) {
          localStorage.setItem(tableName, JSON.stringify({ ...localObj, updated_at: configItem.updated_at }));
        }
      } else {
        localData = JSON.parse(localStorage.getItem(tableName) || '[]');
        localData.forEach(item => {
          if (item && typeof item === 'object') {
            if (!item.id) {
              item.id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              mutated = true;
            }
            if (!item.updated_at) {
              item.updated_at = new Date().toISOString();
              mutated = true;
            }
          }
        });
        if (mutated) {
          localStorage.setItem(tableName, JSON.stringify(localData));
        }
      }

      const localMap = new Map(localData.map(item => [String(item.id), item]));
      const lastSyncKey = `last_sync_${tableName}`;
      const lastSyncTime = localStorage.getItem(lastSyncKey) || new Date(0).toISOString();
      const newSyncTime = new Date().toISOString();

      // جلب السجلات من السحابة
      const { data: rawCloudData, error: fetchError } = await supabase.from(dbTableName).select('*');
      if (fetchError) throw fetchError;

      // تطبيع البيانات السحابية (استخراج الكائنات من عمود JSONB)
      const cloudData = (rawCloudData || []).map(cloudItem => {
        return {
          ...(cloudItem.value || {}),
          id: cloudItem.id,
          updated_at: cloudItem.updated_at
        };
      });

      const cloudMap = new Map(cloudData.map(item => [String(item.id), item]));
      const updatedLocalData = [];
      const pendingUpserts = [];
      const pendingDeletes = [];

      // 1. معالجة وتصنيف السجلات السحابية
      for (const cloudItem of cloudData) {
        const localItem = localMap.get(String(cloudItem.id));

        if (!localItem) {
          // السجل موجود في السحاب وغير موجود محلياً
          if (tableName === 'activeShift') {
            if (cloudItem && cloudItem.status === 'active') {
              updatedLocalData.push(cloudItem);
            }
          } else if (new Date(cloudItem.updated_at).getTime() > new Date(lastSyncTime).getTime()) {
            // تم إضافته حديثاً على جهاز آخر -> تحميل محلي
            updatedLocalData.push(cloudItem);
          } else {
            // كان موجوداً محلياً وتم حذفه بواسطة هذا الجهاز -> حذف من السحاب
            pendingDeletes.push(cloudItem.id);
          }
        } else {
          // السجل موجود في الجهتين
          let useLocal = false;
          if (isSingleObject) {
            // التحقق من الحقول الفعلية (التي لا تشمل id و updated_at والمُعرفات البديلة)
            const cloudKeys = Object.keys(cloudItem).filter(k => k !== 'id' && k !== 'updated_at' && k !== 'originalShiftId' && k !== 'originalImagesId');
            const localKeys = Object.keys(localItem).filter(k => k !== 'id' && k !== 'updated_at' && k !== 'originalShiftId' && k !== 'originalImagesId');
            
            const localTime = new Date(localItem.updated_at || 0).getTime();
            const cloudTime = new Date(cloudItem.updated_at || 0).getTime();
            
            if (localTime !== cloudTime) {
              useLocal = localTime > cloudTime;
            } else {
              if (cloudKeys.length === 0 && localKeys.length > 0) {
                useLocal = true;
              } else if (localKeys.length === 0 && cloudKeys.length > 0) {
                useLocal = false;
              } else {
                useLocal = false;
              }
            }
          } else {
            const localTime = new Date(localItem.updated_at || 0).getTime();
            const cloudTime = new Date(cloudItem.updated_at || 0).getTime();
            useLocal = localTime > cloudTime;
          }

          if (useLocal) {
            pendingUpserts.push(localItem);
            updatedLocalData.push(localItem);
          } else {
            updatedLocalData.push(cloudItem);
          }
        }
      }

      // 2. معالجة السجلات المحلية غير الموجودة في السحاب
      for (const localItem of localData) {
        if (localItem && !cloudMap.has(String(localItem.id))) {
          const localTime = new Date(localItem.updated_at || 0).getTime();
          if (localTime > new Date(lastSyncTime).getTime() || isSingleObject) {
            // سجل جديد تمت إضافته محلياً بعد آخر تزامن (أو إعدادات وحيدة رئيسية) -> رفع للسحاب
            pendingUpserts.push(localItem);
            updatedLocalData.push(localItem);
          } else {
            // تم حذفه من السحاب بواسطة جهاز آخر -> مسحه محلياً
            console.log(`🗑️ حذف الصنف ${localItem.id} محلياً من جدول ${tableName} بسبب حذفه من السحاب`);
          }
        }
      }

      // 3. تنفيذ العمليات على السحاب
      if (pendingUpserts.length > 0) {
        // جميع الجداول في localStorage ستستخدم هيكل id + value المشترك
        const cleanUpserts = pendingUpserts.map(item => {
          const { id, updated_at, ...cleanValue } = item;
          return {
            id: String(item.id),
            value: cleanValue,
            updated_at: item.updated_at || new Date().toISOString()
          };
        });

        const { error: upsertError } = await supabase.from(dbTableName).upsert(cleanUpserts);
        if (upsertError) throw upsertError;
      }

      if (pendingDeletes.length > 0 && !isSingleObject) {
        const { error: deleteError } = await supabase.from(dbTableName).delete().in('id', pendingDeletes);
        if (deleteError) throw deleteError;
      }

      // 4. حفظ وتحديث مصفوفة الـ LocalStorage المحلية بالبيانات المدمجة والنهائية
      if (isSingleObject) {
        const configItem = updatedLocalData[0] || {};
        const { id, ...cleanConfig } = configItem;
        
        // Reconstruct original business ID for single objects
        if (tableName === 'activeShift' && cleanConfig.originalShiftId) {
          cleanConfig.id = cleanConfig.originalShiftId;
          delete cleanConfig.originalShiftId;
        } else if (tableName === 'productImages' && cleanConfig.originalImagesId) {
          cleanConfig.id = cleanConfig.originalImagesId;
          delete cleanConfig.originalImagesId;
        }
        
        if (tableName === 'activeShift') {
          // Detect changes in active shift to publish start/end events to UI components
          const oldShiftStr = localStorage.getItem('activeShift');
          const oldShift = oldShiftStr ? JSON.parse(oldShiftStr) : null;
          const wasActive = oldShift && oldShift.status === 'active';
          const isActiveNow = cleanConfig && cleanConfig.status === 'active';
          
          localStorage.setItem(tableName, JSON.stringify(cleanConfig));
          
          // Publish UI state events
          if (!wasActive && isActiveNow) {
            console.log('⚡ [SyncManager] Shift started on another device, notifying UI:', cleanConfig.id);
            try { publish(EVENTS.SHIFTS_CHANGED, { type: 'start', shift: cleanConfig }); } catch (_) {}
            try { window.dispatchEvent(new CustomEvent('shiftStarted', { detail: { shiftId: cleanConfig.id } })); } catch (_) {}
          } else if (wasActive && !isActiveNow) {
            console.log('⚡ [SyncManager] Shift ended on another device, notifying UI:', oldShift.id);
            try { publish(EVENTS.SHIFTS_CHANGED, { type: 'end', shift: oldShift }); } catch (_) {}
            try { window.dispatchEvent(new CustomEvent('shiftEnded', { detail: { shiftId: oldShift.id } })); } catch (_) {}
          } else if (wasActive && isActiveNow && JSON.stringify(oldShift) !== JSON.stringify(cleanConfig)) {
            console.log('⚡ [SyncManager] Shift updated on another device, notifying UI:', cleanConfig.id);
            try { publish(EVENTS.SHIFTS_CHANGED, { type: 'update', shift: cleanConfig }); } catch (_) {}
          }
        } else {
          localStorage.setItem(tableName, JSON.stringify(cleanConfig));
        }
      } else {
        localStorage.setItem(tableName, JSON.stringify(updatedLocalData));
      }

      localStorage.setItem(lastSyncKey, newSyncTime);

      // إشعار واجهة المستخدم للتحديث الفوري للبيانات المعروضة
      window.dispatchEvent(new CustomEvent('dataUpdated', { detail: { type: tableName } }));

    } catch (e) {
      console.error(`خطأ في مزامنة جدول LocalStorage ${tableName}:`, e);
      throw e;
    } finally {
      window.__bypass_sync_proxy__ = false;
    }
  }
}

const syncManager = new SyncManager();
export default syncManager;
export { syncManager };
