import { supabase, isKeysConfigured } from './supabaseClient.js';
import databaseManager from './database.js';
import { publish, EVENTS } from './observerManager.js';

class SyncManager {
  constructor() {
    this.status = 'synced'; // 'synced' | 'syncing' | 'error' | 'offline'
    this.listeners = new Set();
    this.syncInProgress = false;
    this.syncIntervalId = null;
    this.realtimeChannel = null;
    this.lastSyncedAt = {}; // لتجنب مزامنة التغييرات الصادرة من نفس الجهاز

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
      const REALTIME_TABLES = ['customers', 'sales', 'shifts', 'returns', 'products', 'categories', 'active_shift', 'suppliers'];

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
      const INDEXEDDB_TABLES = ['customers', 'sales', 'shifts', 'returns', 'products', 'categories'];
      const LOCALSTORAGE_TABLES = ['active_shift', 'suppliers'];

      if (INDEXEDDB_TABLES.includes(table)) {
        // تحديث IndexedDB مباشرة
        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          if (newRecord && newRecord.id) {
            // تحويل snake_case للـ camelCase للجداول التي تحتاجه
            const localRecord = this.mapCloudToLocal(table, newRecord);
            localRecord.sync_status = 'synced';
            await databaseManager.update(table, localRecord);
          }
        } else if (eventType === 'DELETE') {
          if (oldRecord && oldRecord.id) {
            await databaseManager.deletePhysical(table, oldRecord.id);
          }
        }

        // إخطار واجهة المستخدم بالتغيير الفوري
        window.dispatchEvent(new CustomEvent('realtimeDataUpdate', { detail: { table, eventType } }));
        window.dispatchEvent(new CustomEvent('dataUpdated', { detail: { type: table } }));

        // تحديث localStorage أيضاً
        const keyMap = { categories: 'productCategories', products: 'products', customers: 'customers', sales: 'sales', shifts: 'shifts', returns: 'returns' };
        const lsKey = keyMap[table];
        if (lsKey) {
          const allItems = await databaseManager.getAll(table);
          if (allItems && allItems.length > 0) {
            localStorage.setItem(lsKey, JSON.stringify(allItems));
          }
        }

      } else if (LOCALSTORAGE_TABLES.includes(table)) {
        // تحديث localStorage مباشرة
        if (eventType !== 'DELETE' && newRecord && newRecord.value) {
          const lsKeyMap = { active_shift: 'activeShift', suppliers: 'suppliers' };
          const lsKey = lsKeyMap[table];
          if (lsKey) {
            localStorage.setItem(lsKey, JSON.stringify(newRecord.value));
            window.dispatchEvent(new CustomEvent('dataUpdated', { detail: { type: lsKey } }));
          }
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
      if (record.down_payment !== undefined) { mapped.downPayment = record.down_payment; delete mapped.down_payment; }
    } else if (table === 'shifts') {
      if (record.start_time !== undefined) { mapped.startTime = record.start_time; delete mapped.start_time; }
      if (record.end_time !== undefined) { mapped.endTime = record.end_time; delete mapped.end_time; }
      if (record.sales_details !== undefined) { mapped.salesDetails = record.sales_details; delete mapped.sales_details; }
      if (record.returns_data !== undefined) { mapped.returns = record.returns_data; delete mapped.returns_data; }
      if (record.cashier_username !== undefined) { mapped.cashier = { username: record.cashier_username }; delete mapped.cashier_username; }
      if (record.opening_amount !== undefined) { mapped.cashDrawer = { openingAmount: record.opening_amount, expectedAmount: record.expected_amount || 0, closingAmount: record.closing_amount || 0 }; delete mapped.opening_amount; delete mapped.expected_amount; delete mapped.closing_amount; }
    } else if (table === 'categories') {
      if (record.parent_id !== undefined) { mapped.parentId = record.parent_id; delete mapped.parent_id; }
    } else if (table === 'products') {
      if (record.main_category_id !== undefined) { mapped.mainCategoryId = record.main_category_id; delete mapped.main_category_id; }
      if (record.sub_category_id !== undefined) { mapped.subCategoryId = record.sub_category_id; delete mapped.sub_category_id; }
      if (record.image_path !== undefined) { mapped.imagePath = record.image_path; delete mapped.image_path; }
    }
    return mapped;
  }

  // مشغل المزامنة الآمن
  async triggerSync() {
    if (this.syncInProgress) return;
    if (!window.navigator.onLine) {
      this.updateStatus('offline');
      return;
    }
    if (!isKeysConfigured) {
      // إذا لم يكن Supabase مهيأ، لا نقوم بأي محاولة اتصال
      return;
    }

    this.syncInProgress = true;
    this.updateStatus('syncing');

    try {
      await this.syncAll();
      this.updateStatus('synced');
    } catch (error) {
      console.error('❌ فشل مزامنة البيانات مع السحاب:', error);
      this.updateStatus('error');
    } finally {
      this.syncInProgress = false;
    }
  }

  // المزامنة الفعلية لكافة الجداول ثنائية الاتجاه
  async syncAll() {
    const stores = ['categories', 'products', 'customers', 'shifts', 'sales', 'returns', 'users'];

    for (const storeName of stores) {
      await this.syncStore(storeName);
    }

    // مزامنة جداول الـ LocalStorage المفقودة لضمان أمان وتزامن النظام بالكامل
    const localStores = [
      'suppliers', 
      'supplier_supplies', 
      'supplier_payments', 
      'expenses',
      'storeInfo',
      'pos-settings',
      'system-settings',
      'activeShift',
      'manufacturing_waste',
      'productImages'
    ];
    for (const storeName of localStores) {
      await this.syncLocalStorageStore(storeName);
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
          const { data: cloudTimestamps, error: timestampError } = await supabase
            .from(storeName)
            .select('id, updated_at')
            .in('id', pendingRecords.map(r => r.id));
          if (!timestampError && cloudTimestamps) {
            cloudMap = new Map(cloudTimestamps.map(c => [String(c.id), c.updated_at]));
          }
        } catch (err) {
          console.warn(`فشل التحقق من تعارضات السحابة لـ ${storeName}، سيتم الرفع المباشر:`, err);
        }
      }

      // رفع الإضافات والتعديلات
      for (const record of pendingRecords) {
        // التحقق من التعارض: إذا كانت النسخة في السحابة أحدث من النسخة المحلية، نتخطى الرفع لتغليب السحابة
        const cloudUpdatedAt = cloudMap.get(String(record.id));
        if (cloudUpdatedAt && new Date(cloudUpdatedAt).getTime() > new Date(record.updated_at || 0).getTime()) {
          console.warn(`⚠️ تعارض لجدول ${storeName} الصنف ${record.id}: النسخة السحابية أحدث. سيتم تخطي الرفع وتغليب السحاب.`);
          continue;
        }

        // تجهيز الكائن للرفع وحذف حالة المزامنة المحلية لمنع تعارض الأعمدة في السحاب
        const { sync_status, ...uploadData } = record;
        
        // استبدال أسماء الأعمدة لتطابق PostgreSQL CamelCase/SnakeCase
        if (storeName === 'categories') {
          uploadData.parent_id = record.parentId;
          delete uploadData.parentId;
          delete uploadData.description; // حقل محلي فقط، لا يوجد في Supabase
        } else if (storeName === 'products') {
          uploadData.main_category_id = record.mainCategoryId;
          uploadData.sub_category_id = record.subCategoryId;
          uploadData.image_path = record.imagePath;
          delete uploadData.mainCategoryId;
          delete uploadData.subCategoryId;
          delete uploadData.imagePath;
          delete uploadData.minStock; // حقل محلي فقط، لا يوجد في Supabase
          delete uploadData.category; // حقل محلي فقط، لا يوجد في Supabase
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
        } else if (storeName === 'sales') {
          uploadData.shift_id = record.shiftId;
          uploadData.customer_id = record.customerId;
          uploadData.discount_amount = record.discountAmount;
          uploadData.tax_amount = record.taxAmount;
          uploadData.payment_method = record.paymentMethod;
          uploadData.payment_status = record.paymentStatus;
          uploadData.down_payment = record.downPayment;
          delete uploadData.shiftId;
          delete uploadData.customerId;
          delete uploadData.discountAmount;
          delete uploadData.taxAmount;
          delete uploadData.paymentMethod;
          delete uploadData.paymentStatus;
          delete uploadData.downPayment;
        } else if (storeName === 'shifts') {
          uploadData.start_time = record.startTime;
          uploadData.end_time = record.endTime;
          uploadData.opening_amount = record.cashDrawer?.openingAmount || 0;
          uploadData.expected_amount = record.cashDrawer?.expectedAmount || 0;
          uploadData.closing_amount = record.cashDrawer?.closingAmount || 0;
          uploadData.cashier_username = record.cashier?.username || record.cashier || 'unknown';
          uploadData.sales_details = record.salesDetails;
          uploadData.returns_data = record.returns;
          delete uploadData.startTime;
          delete uploadData.endTime;
          delete uploadData.cashDrawer;
          delete uploadData.cashier;
          delete uploadData.salesDetails;
          delete uploadData.returns;
        } else if (storeName === 'returns') {
          uploadData.ref_invoice_id = record.refInvoiceId;
          uploadData.shift_id = record.shiftId;
          delete uploadData.refInvoiceId;
          delete uploadData.shiftId;
        }

        let { error } = await supabase.from(storeName).upsert(uploadData);
        
        // إذا كان الخطأ بسبب عمود غير موجود (PGRST204)، نحاول الرفع بدون الأعمدة الإضافية
        if (error && error.code === 'PGRST204') {
          console.warn(`⚠️ [SyncManager] عمود غير موجود في جدول ${storeName}، سيتم الرفع بالأعمدة الأساسية فقط...`);
          // الاحتفاظ بالأعمدة الأساسية المضمون وجودها في كل الأجهزة
          const safeData = { id: uploadData.id, updated_at: uploadData.updated_at };
          if (storeName === 'customers') {
            if (uploadData.name) safeData.name = uploadData.name;
            if (uploadData.phone) safeData.phone = uploadData.phone;
            if (uploadData.email) safeData.email = uploadData.email;
            if (uploadData.total_spent !== undefined) safeData.total_spent = uploadData.total_spent;
            if (uploadData.last_visit) safeData.last_visit = uploadData.last_visit;
            if (uploadData.join_date) safeData.join_date = uploadData.join_date;
            // محاولة إضافة الحقول الجديدة بشكل فردي
            const extendedFields = ['address', 'type', 'status', 'debt'];
            for (const field of extendedFields) {
              if (uploadData[field] !== undefined) {
                const testData = { ...safeData, [field]: uploadData[field] };
                const { error: testErr } = await supabase.from(storeName).upsert(testData);
                if (!testErr) {
                  safeData[field] = uploadData[field];
                }
              }
            }
          } else if (storeName === 'users') {
            if (uploadData.username) safeData.username = uploadData.username;
            if (uploadData.email) safeData.email = uploadData.email;
            if (uploadData.role) safeData.role = uploadData.role;
            if (uploadData.password) safeData.password = uploadData.password;
          } else if (storeName === 'sales') {
            Object.assign(safeData, uploadData);
          } else if (storeName === 'shifts') {
            Object.assign(safeData, uploadData);
          } else {
            Object.assign(safeData, uploadData);
          }
          const { error: retryError } = await supabase.from(storeName).upsert(safeData);
          error = retryError;
          if (!retryError) {
            console.log(`✅ [SyncManager] تم الرفع بنجاح للجدول ${storeName} بالأعمدة المتاحة`);
          }
        }

        if (!error) {
          record.sync_status = 'synced';
          // حفظ محلياً بحالة 'synced' دون إطلاق حدث تزامن مجدداً لمنع الحلقة اللانهائية
          const transaction = databaseManager.db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          store.put(record);
        } else {
          console.error(`❌ خطأ في رفع الصنف ${record.id} في جدول ${storeName}:`, error);
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
        const times = syncedRecords.map(r => new Date(r.updated_at || 0).getTime());
        lastLocalUpdate = new Date(Math.max(...times)).toISOString();
      }

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

      if (cloudUpdates.length > 0) {
        console.log(`📥 تم تحميل ${cloudUpdates.length} تحديثاً سحابياً لجدول ${storeName}`);
        
        for (const cloudItem of cloudUpdates) {
          // جلب السجل المحلي الموجود للحفاظ على الحقول المحلية فقط (مثل minStock)
          const existingLocal = await databaseManager.get(storeName, cloudItem.id);
          
          // تطبيع أسماء الأعمدة لتطابق واجهة React (تحويل من SnakeCase إلى CamelCase)
          const localItem = {
            ...(existingLocal || {}),
            ...cloudItem,
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
            localItem.downPayment = cloudItem.down_payment;
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
            localItem.salesDetails = cloudItem.sales_details;
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
            localStorage.setItem(localStorageKey, JSON.stringify(allItems));
            
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
        const configItem = { ...localObj, id: 'config' };
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
          // السجل موجود في الجهتين -> مقارنة التواقيت الزمنية للنسخ الأحدث
          const localTime = new Date(localItem.updated_at || 0).getTime();
          const cloudTime = new Date(cloudItem.updated_at || 0).getTime();

          if (localTime > cloudTime) {
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
          if (localTime > new Date(lastSyncTime).getTime()) {
            // سجل جديد تمت إضافته محلياً بعد آخر تزامن -> رفع للسحاب
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
        localStorage.setItem(tableName, JSON.stringify(cleanConfig));
      } else {
        localStorage.setItem(tableName, JSON.stringify(updatedLocalData));
      }

      localStorage.setItem(lastSyncKey, newSyncTime);

      // إشعار واجهة المستخدم للتحديث الفوري للبيانات المعروضة
      window.dispatchEvent(new CustomEvent('dataUpdated', { detail: { type: tableName } }));

    } catch (e) {
      console.error(`خطأ في مزامنة جدول LocalStorage ${tableName}:`, e);
      throw e;
    }
  }
}

const syncManager = new SyncManager();
export default syncManager;
export { syncManager };
