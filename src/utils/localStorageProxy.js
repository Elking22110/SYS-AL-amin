import databaseManager from './database.js';

// الجداول القابلة للمزامنة عبر IndexedDB و Supabase
const SYNCABLE_STORES = ['products', 'categories', 'customers', 'sales', 'shifts', 'returns', 'users'];

// كاش محلي لتجنب قراءة localStorage في كل مرة نحتاج فيها للمقارنة
const localCache = new Map();

// الاحتفاظ بالدالة الأصلية
const originalSetItem = localStorage.setItem;

/**
 * دالة تفريغ المتغيرات لتسريع المعالجة وحساب الفروقات
 */
const diffArrays = (oldArray, newArray) => {
    try {
        const oldMap = new Map(oldArray.map(item => [String(item.id), item]));
        const newMap = new Map(newArray.map(item => [String(item.id), item]));

        const added = newArray.filter(item => !oldMap.has(String(item.id)));
        const updated = newArray.filter(item => {
            const oldItem = oldMap.get(String(item.id));
            if (!oldItem) return false;
            // فحص التغيير الحقيقي بتجاهل حقل updated_at
            const { updated_at: u1, sync_status: s1, ...o1 } = oldItem;
            const { updated_at: u2, sync_status: s2, ...o2 } = item;
            return JSON.stringify(o1) !== JSON.stringify(o2);
        });
        
        // المحذوفات
        const deleted = oldArray.filter(item => !newMap.has(String(item.id)));

        return { added, updated, deleted };
    } catch (e) {
        console.error("Error diffing arrays in localStorageProxy:", e);
        return { added: [], updated: [], deleted: [] };
    }
};

// الجداول المخزنة محلياً بالكامل والتي يتم مزامنتها كائنات أو مصفوفات في Supabase
const LOCAL_SYNC_STORES = [
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

/**
 * فلترة اعتراض حفظ localStorage وتوجيه التحديثات الحقيقية إلى IndexedDB أو المزامنة المباشرة
 */
localStorage.setItem = function(key, value) {
    // 1. التنفيذ الفوري السريع للحفاظ على أداء واجهة المستخدم React
    originalSetItem.apply(this, arguments);

    // 2. معالجة غير متزامنة (خلفية) لمعرفة ما إذا كان يجب المزامنة
    if (SYNCABLE_STORES.includes(key)) {
        setTimeout(async () => {
            try {
                const oldArray = localCache.get(key) || [];
                const newArray = JSON.parse(value);
                
                // تحديث الكاش
                localCache.set(key, newArray);
                
                // إذا لم يكن هناك كاش سابق (مثلاً عند بدء التطبيق)، نتجاهل الـ diff
                if (!localCache.has(key) && oldArray.length === 0 && newArray.length > 0) {
                    return; 
                }

                if (Array.isArray(newArray) && Array.isArray(oldArray)) {
                    const { added, updated, deleted } = diffArrays(oldArray, newArray);
                    
                    let dbMutated = false;

                    // تحديث الإضافات والتعديلات
                    const toUpsert = [...added, ...updated];
                    for (const item of toUpsert) {
                        item.sync_status = 'pending';
                        item.updated_at = new Date().toISOString();
                        await databaseManager.update(key, item);
                        dbMutated = true;
                    }

                    // تحديث المحذوفات (Soft Delete)
                    for (const delItem of deleted) {
                        await databaseManager.delete(key, delItem.id);
                        dbMutated = true;
                    }

                    // إشعار مدير المزامنة السحابية (syncManager)
                    if (dbMutated) {
                        console.log(`[SyncProxy] Detected IndexedDB changes in ${key}. Added: ${added.length}, Updated: ${updated.length}, Deleted: ${deleted.length}`);
                        window.dispatchEvent(new CustomEvent('databaseSyncTrigger', { detail: { storeName: key } }));
                    }
                }
            } catch (error) {
                console.error(`[SyncProxy] Error processing IndexedDB sync for store ${key}:`, error);
            }
        }, 0);
    } else if (LOCAL_SYNC_STORES.includes(key)) {
        setTimeout(async () => {
            try {
                const isSingleObject = ['storeInfo', 'pos-settings', 'system-settings'].includes(key);
                let changed = false;

                if (isSingleObject) {
                    const oldObj = localCache.get(key) || {};
                    const newObj = JSON.parse(value);
                    
                    // مقارنة التغيير الحقيقي للملف التعريفي/الإعدادات
                    const { updated_at: u1, ...o1 } = oldObj;
                    const { updated_at: u2, ...o2 } = newObj;
                    
                    if (JSON.stringify(o1) !== JSON.stringify(o2)) {
                        newObj.updated_at = new Date().toISOString();
                        originalSetItem.call(localStorage, key, JSON.stringify(newObj));
                        localCache.set(key, newObj);
                        changed = true;
                    }
                } else {
                    const oldArray = localCache.get(key) || [];
                    const newArray = JSON.parse(value);
                    
                    localCache.set(key, newArray);

                    if (Array.isArray(newArray) && Array.isArray(oldArray)) {
                        const { added, updated, deleted } = diffArrays(oldArray, newArray);
                        
                        if (added.length > 0 || updated.length > 0 || deleted.length > 0) {
                            // تحديث تواقيت التعديل للمعدلة والمضافة فقط داخل localStorage نفسه
                            newArray.forEach(item => {
                                const isAdded = added.some(a => a.id === item.id);
                                const isUpdated = updated.some(u => u.id === item.id);
                                if (isAdded || isUpdated) {
                                    item.updated_at = new Date().toISOString();
                                }
                            });
                            
                            originalSetItem.call(localStorage, key, JSON.stringify(newArray));
                            localCache.set(key, newArray);
                            changed = true;
                        }
                    }
                }

                if (changed) {
                    console.log(`[SyncProxy] LocalStorage store ${key} mutated. Triggering background cloud sync...`);
                    window.dispatchEvent(new CustomEvent('databaseSyncTrigger', { detail: { storeName: key } }));
                }
            } catch (error) {
                console.error(`[SyncProxy] Error processing LocalStorage sync for store ${key}:`, error);
            }
        }, 0);
    }
};

// تهيئة الكاش الأولي من localStorage الحالي
setTimeout(() => {
    SYNCABLE_STORES.forEach(key => {
        try {
            const data = localStorage.getItem(key);
            if (data) {
                localCache.set(key, JSON.parse(data));
            }
        } catch(e) {}
    });
    console.log('[SyncProxy] Interceptor Initialized successfully.');
}, 100);

export default true;
