import { supabase, isKeysConfigured, supabaseUrl } from './supabaseClient.js';
import databaseManager from './database.js';
import { publish, EVENTS } from './observerManager.js';

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
        console.log(`🔄 تعديل محلي في الجدول ${e.detail?.storeName}، بدء مزامنة خلفية...`);
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

  // التحقق من تغيير المشروع وتصفير مؤشرات المزامنة القديمة لتجنب حذف البيانات المحلية
  async checkProjectSwitch() {
    if (!isKeysConfigured || !supabase) return;
    
    try {
      const currentUrl = supabaseUrl;
      const match = currentUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.(co|net)/i);
      const projectId = match ? match[1] : '';
      
      if (!projectId) return;
      
      const savedProjectId = localStorage.getItem('current_supabase_project_id');
      if (savedProjectId !== projectId) {
        console.log(`🔄 [SyncManager] تم اكتشاف تغيير في مشروع Supabase من "${savedProjectId}" إلى "${projectId}". تهيئة المزامنة الكاملة...`);
        
        // 1. مسح جميع مؤشرات آخر تزامن من localStorage
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('last_sync_') || key.startsWith('last_sync_')) {
            localStorage.removeItem(key);
          }
        });
        
        // 2. تحديث جميع العناصر المحلية في IndexedDB لتكون pending لتُرفع للمشروع الجديد
        const stores = ['categories', 'products', 'customers', 'shifts', 'sales', 'returns', 'users'];
        for (const storeName of stores) {
          try {
            const records = await databaseManager.getAll(storeName);
            if (records && records.length > 0) {
              console.log(`🔄 [SyncManager] تجهيز ${records.length} سجل في ${storeName} للرفع إلى المشروع الجديد...`);
              for (const record of records) {
                record.sync_status = 'pending';
                record.updated_at = new Date().toISOString();
                await databaseManager.update(storeName, record);
              }
            }
          } catch (err) {
            console.error(`خطأ في تحديث جدول ${storeName} للمشروع الجديد:`, err);
          }
        }
        
        // 3. حفظ معرف المشروع الجديد
        localStorage.setItem('current_supabase_project_id', projectId);
        console.log(`✅ [SyncManager] اكتملت تهيئة الانتقال للمشروع الجديد.`);
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
            // تحويل snake_case للـ camelCase للجداول التي تحتاجه
            // تحويل ID لنص لمنع التكرار في IndexedDB
            newRecord.id = String(newRecord.id);
            const localRecord = this.mapCloudToLocal(table, newRecord);
            localRecord.sync_status = 'synced';
            await databaseManager.update(table, localRecord);
          }
        } else if (eventType === 'DELETE') {
          if (oldRecord && oldRecord.id) {
            await databaseManager.deletePhysical(table, String(oldRecord.id));
          }
        }

        // إخطار واجهة المستخدم بالتغيير الفوري
        window.dispatchEvent(new CustomEvent('realtimeDataUpdate', { detail: { table, eventType } }));
        window.dispatchEvent(new CustomEvent('dataUpdated', { detail: { type: table } }));

        // تحديث localStorage أيضاً
        const keyMap = { categories: 'productCategories', products: 'products', customers: 'customers', sales: 'sales', shifts: 'shifts', returns: 'returns', users: 'users' };
        const eventMap = { categories: EVENTS.CATEGORIES_CHANGED, products: EVENTS.PRODUCTS_CHANGED, customers: EVENTS.CUSTOMERS_CHANGED, sales: EVENTS.INVOICES_CHANGED, shifts: EVENTS.SHIFTS_CHANGED, returns: EVENTS.RETURNS_CHANGED, users: EVENTS.USERS_CHANGED };
        const lsKey = keyMap[table];
        if (lsKey) {
          const allItems = await databaseManager.getAll(table);

          if (eventType === 'DELETE') {
            // عند الحذف: نمسح العنصر صراحةً من localStorage بدون merge حتى لا يرجع
            const deletedId = String((oldRecord && oldRecord.id) || (newRecord && newRecord.id) || '');
            try {
              let currentLS = JSON.parse(localStorage.getItem(lsKey) || '[]');
              if (Array.isArray(currentLS) && deletedId) {
                currentLS = currentLS.filter(item => item && String(item.id) !== deletedId);
              }
              // دمج مع IDB للحصول على أي تحديثات أخرى مع استبعاد المحذوف
              const idbMap = new Map((allItems || []).map(item => [String(item.id), item]));
              for (const lsItem of currentLS) {
                if (lsItem && lsItem.id && !idbMap.has(String(lsItem.id)) && String(lsItem.id) !== deletedId) {
                  idbMap.set(String(lsItem.id), lsItem);
                }
              }
              window.__bypass_sync_proxy__ = true;
              localStorage.setItem(lsKey, JSON.stringify(Array.from(idbMap.values())));
              window.__bypass_sync_proxy__ = false;
            } catch (_) {}
          } else {
            // عند INSERT/UPDATE: نعمل merge لحماية السجلات المعلقة (pending) من الضياع
            let idbMap = new Map((allItems || []).map(item => [String(item.id), item]));
            try {
              const currentLS = JSON.parse(localStorage.getItem(lsKey) || '[]');
              if (Array.isArray(currentLS)) {
                for (const lsItem of currentLS) {
                  if (lsItem && lsItem.id && !idbMap.has(String(lsItem.id))) {
                    idbMap.set(String(lsItem.id), lsItem);
                  }
                }
              }
            } catch (_) {}
            window.__bypass_sync_proxy__ = true;
            localStorage.setItem(lsKey, JSON.stringify(Array.from(idbMap.values())));
            window.__bypass_sync_proxy__ = false;
          }

          // إشعار واجهة المستخدم بالحدث المناسب
          const eventName = eventMap[table];
          if (eventName) {
            try { publish(eventName, { type: eventType.toLowerCase(), table }); } catch (_) {}
          }
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
    } catch (err) {
      console.error('❌ [Realtime] خطأ في معالجة التغيير الفوري:', err);
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
      if (record.image_path !== undefined) { mapped.imagePath = record.image_path; delete mapped.image_path; }
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
        setTimeout(() => this.triggerSync(), 0);
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

  // مزامنة جدول فردي
  async syncStore(storeName) {
    try {
      // 1. معالجة وتصدير البيانات المعدلة محلياً (Pending & Deleted) إلى السحاب
      const localRecords = await databaseManager.getAllForSync(storeName);
      
      const pendingRecords = localRecords.filter(r => r && r.sync_status === 'pending');
      const deletedRecords = localRecords.filter(r => r && r.sync_status === 'deleted');

      // جلب تواريخ التحديث السحابية للسجلات المعلقة للتحقق من وجود تعارضات (Last-Write-Wins)
      let cloudMap = new Map();
      if (pendingRecords.length > 0) {
        try {
          const { data: cloudTimestamps, error: timestampError } = await this.withCloudTimeout(
            supabase.from(storeName).select('id, updated_at').in('id', pendingRecords.map(r => r.id)),
            15000,
            `timestamp-check ${storeName}`
          );
          if (!timestampError && cloudTimestamps) {
            cloudMap = new Map(cloudTimestamps.map(c => [String(c.id), c.updated_at]));
          }
        } catch (err) {
          console.warn(`فشل التحقق من تعارضات السحابة لـ ${storeName}، سيتم الرفع المباشر:`, err);
        }
      }

      // رفع الإضافات والتعديلات على شكل دفعات (Batches) لزيادة السرعة والترشيد
      if (pendingRecords.length > 0) {
        const batchData = [];
        const originalRecordsMap = new Map();

        for (const record of pendingRecords) {
          // التحقق من التعارض
          const cloudUpdatedAt = cloudMap.get(String(record.id));
          if (cloudUpdatedAt && new Date(cloudUpdatedAt).getTime() > new Date(record.updated_at || 0).getTime()) {
            console.warn(`⚠️ تعارض لجدول ${storeName} الصنف ${record.id}: النسخة السحابية أحدث. سيتم تخطي الرفع وتغليب السحاب.`);
            continue;
          }

          const { sync_status, ...uploadData } = record;
          uploadData.id = String(record.id);
          
          // استبدال أسماء الأعمدة لتطابق PostgreSQL CamelCase/SnakeCase
          if (storeName === 'categories') {
            uploadData.parent_id = record.parentId;
            delete uploadData.parentId;
            delete uploadData.description; // حقل محلي فقط، لا يوجد في Supabase
            // أعمدة السكيما فقط — منع PGRST204 ومسار الرفع الفردي البطيء
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
            delete uploadData.minStock; // حقل محلي فقط، لا يوجد في Supabase
            delete uploadData.category; // حقل محلي فقط، لا يوجد في Supabase
            const prod = {
              id: String(record.id),
              name: uploadData.name,
              price: uploadData.price ?? 0,
              cost: uploadData.cost ?? 0,
              stock: uploadData.stock ?? 0,
              barcode: uploadData.barcode ?? null,
              main_category_id: uploadData.main_category_id ?? null,
              sub_category_id: uploadData.sub_category_id ?? null,
              image_path: uploadData.image_path ?? null,
              updated_at: uploadData.updated_at || new Date().toISOString()
            };
            Object.keys(uploadData).forEach(k => delete uploadData[k]);
            Object.assign(uploadData, prod);
          } else if (storeName === 'customers') {
            if (record.totalSpent !== undefined) uploadData.total_spent = record.totalSpent;
            if (record.lastVisit !== undefined) uploadData.last_visit = record.lastVisit;
            if (record.joinDate !== undefined) uploadData.join_date = record.joinDate;
            delete uploadData.totalSpent;
            delete uploadData.lastVisit;
            delete uploadData.joinDate;
            // الأعمدة المضافة في السكيما الجديدة - نتأكد من إرسالها بشكل صحيح
            if (uploadData.address === undefined) delete uploadData.address;
            if (uploadData.type === undefined) delete uploadData.type;
            if (uploadData.status === undefined) delete uploadData.status;
            if (uploadData.debt === undefined) delete uploadData.debt;

            const cust = {
              id: String(record.id),
              name: uploadData.name,
              phone: uploadData.phone ?? null,
              email: uploadData.email ?? null,
              status: uploadData.status ?? 'نشط',
              debt: uploadData.debt ?? 0,
              total_spent: uploadData.total_spent ?? 0,
              last_visit: uploadData.last_visit ?? null,
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
            // دمج التسويات داخل down_payment لأن السكيما لا تحتوي عمود settlements
            const downPayment = record.downPayment && typeof record.downPayment === 'object'
              ? { ...record.downPayment }
              : {};
            if (record.settlements) downPayment._settlements = record.settlements;
            if (record.settlement) downPayment._settlement = record.settlement;
            uploadData.down_payment = downPayment;
            const sale = {
              id: String(record.id),
              date: record.date ?? null,
              timestamp: record.timestamp ?? null,
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
            // تضمين فواتير الوردية داخل sales_details JSONB حتى تتزامن التقارير عبر الأجهزة
            const details = (record.salesDetails && typeof record.salesDetails === 'object')
              ? { ...record.salesDetails }
              : {};
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
              timestamp: record.timestamp ?? null,
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
            if (!effUser || !uploadData.password) { console.warn('SyncManager: skip user ' + record.id + ': no username/password'); continue; }
            uploadData.username = effUser;
          }

          batchData.push(uploadData);
          originalRecordsMap.set(String(record.id), record);
        }

        // تقسيم البيانات إلى دفعات (مثلاً كل دفعة 200 سجل) لتجنب تجاوز قيود حجم الطلب
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
          
          // في حال فشل الدفعة بسبب عمود مفقود (PGRST204) أو غيره، نقوم بالرفع الفردي التراجعي كاحتياط
          if (error) {
            console.warn(`⚠️ [SyncManager] فشل رفع دفعة لـ ${storeName}، الانتقال للرفع الفردي التراجعي...`, error);
            // عند الـ timeout نتخطى الرفع الفردي لـ 200 سجل حتى لا نعلق دقائق
            if (error.code === 'TIMEOUT') {
              continue;
            }
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
                  
                  const extendedFields = ['address', 'type', 'status', 'debt'];
                  for (const field of extendedFields) {
                    if (singleUploadData[field] !== undefined) {
                      const testData = { ...safeData, [field]: singleUploadData[field] };
                      const { error: testErr } = await supabase.from(storeName).upsert(testData);
                      if (!testErr) {
                        safeData[field] = singleUploadData[field];
                      }
                    }
                  }
                } else if (storeName === 'users') {
                  if (singleUploadData.username) safeData.username = singleUploadData.username;
                  if (singleUploadData.email) safeData.email = singleUploadData.email;
                  if (singleUploadData.role) safeData.role = singleUploadData.role;
                  if (singleUploadData.password) safeData.password = singleUploadData.password;
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
              } else {
                console.error(`❌ خطأ في رفع الصنف ${singleUploadData.id} في جدول ${storeName}:`, singleError);
              }
            }
          } else {
            // نجاح الدفعة بأكملها -> تحديث الحالة محلياً لـ synced دفعة واحدة
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

      // معالجة المرتجعات والمحذوفات في السحاب
      for (const record of deletedRecords) {
        const { error } = await supabase.from(storeName).delete().eq('id', record.id);
        if (!error || error.code === 'PGRST116') { // نجح الحذف أو السجل غير موجود أصلاً في السحاب
          await databaseManager.deletePhysical(storeName, record.id);
        } else {
          console.error(`خطأ في حذف الصنف ${record.id} من سحابة ${storeName}:`, error);
        }
      }

      // 2. استيراد وتحديث البيانات المعدلة في السحاب للأسفل (Download) - معالجة الصفحات لدعم أي عدد من السجلات
      const syncedRecords = localRecords.filter(r => r && r.sync_status === 'synced');
      let lastLocalUpdate = new Date(0).toISOString();
      if (syncedRecords.length > 0) {
        const times = syncedRecords.map(r => {
          const t = new Date(r.updated_at || 0).getTime();
          return isNaN(t) ? 0 : t;
        });
        lastLocalUpdate = new Date(Math.max(...times)).toISOString();
      }
      
      console.log(`🔍 [SyncManager] جدول: ${storeName} | السجلات المحلية: ${localRecords.length} | المتزامنة: ${syncedRecords.length} | آخر تزامن: ${lastLocalUpdate}`);

      let cloudUpdates = [];
      let hasMore = true;
      let lastFetchedTime = lastLocalUpdate;
      const pageSize = 1000;

      while (hasMore) {
        const { data, error: fetchError } = await supabase
          .from(storeName)
          .select('*')
          .gt('updated_at', lastFetchedTime)
          .order('updated_at', { ascending: true })
          .limit(pageSize);

        if (fetchError) {
          throw fetchError;
        }

        if (data && data.length > 0) {
          cloudUpdates = [...cloudUpdates, ...data];
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            // تحديث التوقيت ليكون توقيت آخر عنصر تم جلبه للانتقال للصفحة التالية
            lastFetchedTime = data[data.length - 1].updated_at;
          }
        } else {
          hasMore = false;
        }
      }

      // بناء مجموعة IDs المحذوفة محلياً لتجنب استعادة ما حذفه المستخدم من السحابة
      const deletedIdsSet = new Set(localRecords.filter(r => r && r.sync_status === 'deleted').map(r => String(r.id)));

      if (cloudUpdates.length > 0) {
        console.log(`📥 تم تحميل ${cloudUpdates.length} تحديثاً سحابياً لجدول ${storeName}`);
        
        for (const cloudItem of cloudUpdates) {
          // تحويل ID من رقم إلى نص لمنع التكرار في IndexedDB (أصل مشكلة التضاعف)
          if (cloudItem.id !== undefined && cloudItem.id !== null) {
            cloudItem.id = String(cloudItem.id);
          }

          // تخطي السجلات المحذوفة محلياً — لا نُعيدها من السحاب أبداً
          if (deletedIdsSet.has(cloudItem.id)) {
            console.log(`🚫 [SyncManager] تخطي استعادة سجل محذوف محلياً: ${storeName}/${cloudItem.id}`);
            continue;
          }

          // جلب السجل المحلي الموجود للحفاظ على الحقول المحلية فقط (مثل minStock)
          const existingLocal = await databaseManager.get(storeName, cloudItem.id);
          
          // تطبيع أسماء الأعمدة لتطابق واجهة React (تحويل من SnakeCase إلى CamelCase)
          const localItem = {
            ...(existingLocal || {}),
            ...cloudItem,
            id: cloudItem.id, // ضمان أن الـ id نصي دائماً
            sync_status: 'synced'
          };
          
          if (storeName === 'categories') {
            localItem.parentId = cloudItem.parent_id;
            delete localItem.parent_id;
          } else if (storeName === 'products') {
            localItem.mainCategoryId = cloudItem.main_category_id;
            localItem.subCategoryId = cloudItem.sub_category_id;
            localItem.imagePath = cloudItem.image_path;
            if (localItem.minStock === undefined) {
              localItem.minStock = 5; // الحد الأدنى الافتراضي للمخزون محلياً
            }
            delete localItem.main_category_id;
            delete localItem.sub_category_id;
            delete localItem.image_path;
          } else if (storeName === 'customers') {
            if (cloudItem.total_spent !== undefined) localItem.totalSpent = cloudItem.total_spent;
            if (cloudItem.last_visit !== undefined) localItem.lastVisit = cloudItem.last_visit;
            if (cloudItem.join_date !== undefined) localItem.joinDate = cloudItem.join_date;
            delete localItem.total_spent;
            delete localItem.last_visit;
            delete localItem.join_date;
          } else if (storeName === 'sales') {
            localItem.shiftId = cloudItem.shift_id;
            localItem.customerId = cloudItem.customer_id;
            localItem.discountAmount = cloudItem.discount_amount;
            localItem.taxAmount = cloudItem.tax_amount;
            localItem.paymentMethod = cloudItem.payment_method;
            localItem.paymentStatus = cloudItem.payment_status;
            if (cloudItem.down_payment && typeof cloudItem.down_payment === 'object') {
              const dp = { ...cloudItem.down_payment };
              if (dp._settlements) { localItem.settlements = dp._settlements; delete dp._settlements; }
              if (dp._settlement) { localItem.settlement = dp._settlement; delete dp._settlement; }
              localItem.downPayment = dp;
            } else {
              localItem.downPayment = cloudItem.down_payment;
            }
            delete localItem.shift_id;
            delete localItem.customer_id;
            delete localItem.discount_amount;
            delete localItem.tax_amount;
            delete localItem.payment_method;
            delete localItem.payment_status;
            delete localItem.down_payment;
          } else if (storeName === 'shifts') {
            localItem.startTime = cloudItem.start_time;
            localItem.endTime = cloudItem.end_time;
            localItem.cashDrawer = {
              openingAmount: Number(cloudItem.opening_amount) || 0,
              expectedAmount: Number(cloudItem.expected_amount) || 0,
              closingAmount: Number(cloudItem.closing_amount) || 0
            };
            localItem.cashier = { username: cloudItem.cashier_username };
            if (cloudItem.sales_details && typeof cloudItem.sales_details === 'object') {
              const details = { ...cloudItem.sales_details };
              if (Array.isArray(details._invoices)) {
                localItem.sales = details._invoices;
                delete details._invoices;
              }
              localItem.salesDetails = details;
            } else {
              localItem.salesDetails = cloudItem.sales_details;
            }
            localItem.returns = cloudItem.returns_data;
            delete localItem.start_time;
            delete localItem.end_time;
            delete localItem.opening_amount;
            delete localItem.expected_amount;
            delete localItem.closing_amount;
            delete localItem.cashier_username;
            delete localItem.sales_details;
            delete localItem.returns_data;
          } else if (storeName === 'returns') {
            localItem.refInvoiceId = cloudItem.ref_invoice_id;
            localItem.shiftId = cloudItem.shift_id;
            delete localItem.ref_invoice_id;
            delete localItem.shift_id;
          } else if (storeName === 'users') {
            if (cloudItem.created_at !== undefined) { localItem.createdAt = cloudItem.created_at; delete localItem.created_at; }
            if (cloudItem.last_login !== undefined) { localItem.lastLogin = cloudItem.last_login; delete localItem.last_login; }
          }

          // حفظ محلياً في IndexedDB دون إطلاق حدث تزامن لمنع الدوران اللانهائي
          const transaction = databaseManager.db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          store.put(localItem);
        }

        // تحديث LocalStorage من IndexedDB للحفاظ على تزامن واجهة المستخدم اللحظي
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
            // دمج العناصر في IndexedDB مع العناصر الحالية في localStorage
            // لمنع فقدان العناصر الجديدة التي لم تُحفظ في IndexedDB بعد (بسبب تأخر الـ proxy)
            let idbMap = new Map(allItems.map(item => [String(item.id), item]));
            try {
              const currentLS = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
              if (Array.isArray(currentLS)) {
                for (const lsItem of currentLS) {
                  if (lsItem && lsItem.id && !idbMap.has(String(lsItem.id))) {
                    // عنصر موجود في localStorage لكن غير موجود في IndexedDB بعد → نحتفظ به
                    idbMap.set(String(lsItem.id), lsItem);
                  }
                }
              }
            } catch (_) {}
            const mergedItems = Array.from(idbMap.values());
            window.__bypass_sync_proxy__ = true;
            localStorage.setItem(localStorageKey, JSON.stringify(mergedItems));
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
          }
        } catch (err) {
          console.error(`[SyncManager] Failed to update localStorage for ${storeName}:`, err);
        }

        // إطلاق حدث للتطبيق العام لتحديث واجهاته بالبيانات الجديدة المستوردة
        window.dispatchEvent(new CustomEvent('dataUpdated', { detail: { type: storeName } }));
      }

    } catch (e) {
      console.error(`خطأ في مزامنة جدول ${storeName}:`, e);
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
          configItem.updated_at = new Date().toISOString();
          mutated = true;
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
          if (new Date(cloudItem.updated_at).getTime() > new Date(lastSyncTime).getTime()) {
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
            
            if (cloudKeys.length === 0 && localKeys.length > 0) {
              // السحاب فارغ والمحلي يحتوي بيانات -> غلّب المحلي ليرفعه
              useLocal = true;
            } else if (localKeys.length === 0 && cloudKeys.length > 0) {
              // المحلي فارغ والسحاب يحتوي بيانات -> غلّب السحاب لتنزيله
              useLocal = false;
            } else {
              const localTime = new Date(localItem.updated_at || 0).getTime();
              const cloudTime = new Date(cloudItem.updated_at || 0).getTime();
              useLocal = localTime > cloudTime;
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
