const fs = require('fs');
let code = fs.readFileSync('./src/utils/syncManager.js', 'utf8');

// Fix 1: Add users to INDEXEDDB_TABLES
code = code.replace(
  "const INDEXEDDB_TABLES = ['customers', 'sales', 'shifts', 'returns', 'products', 'categories'];",
  "const INDEXEDDB_TABLES = ['customers', 'sales', 'shifts', 'returns', 'products', 'categories', 'users'];"
);

// Fix 2: Normalize cloud ID in handleRealtimeChange
code = code.replace(
  "// تحويل snake_case للـ camelCase للجداول التي تحتاجه\r\n            const localRecord = this.mapCloudToLocal(table, newRecord);",
  "newRecord.id = String(newRecord.id);\r\n            // تحويل snake_case للـ camelCase للجداول التي تحتاجه\r\n            const localRecord = this.mapCloudToLocal(table, newRecord);"
);

// Fix 3: Normalize delete ID in handleRealtimeChange
code = code.replace(
  "await databaseManager.deletePhysical(table, oldRecord.id);",
  "await databaseManager.deletePhysical(table, String(oldRecord.id));"
);

// Fix 4: Add users to keyMap in handleRealtimeChange
code = code.replace(
  "const keyMap = { categories: 'productCategories', products: 'products', customers: 'customers', sales: 'sales', shifts: 'shifts', returns: 'returns' };",
  "const keyMap = { categories: 'productCategories', products: 'products', customers: 'customers', sales: 'sales', shifts: 'shifts', returns: 'returns', users: 'users' };"
);

// Fix 5: Add users mapping in mapCloudToLocal
code = code.replace(
  "    } else if (table === 'products') {\r\n      if (record.main_category_id !== undefined) { mapped.mainCategoryId = record.main_category_id; delete mapped.main_category_id; }\r\n      if (record.sub_category_id !== undefined) { mapped.subCategoryId = record.sub_category_id; delete mapped.sub_category_id; }\r\n      if (record.image_path !== undefined) { mapped.imagePath = record.image_path; delete mapped.image_path; }\r\n    }\r\n    return mapped;",
  "    } else if (table === 'products') {\r\n      if (record.main_category_id !== undefined) { mapped.mainCategoryId = record.main_category_id; delete mapped.main_category_id; }\r\n      if (record.sub_category_id !== undefined) { mapped.subCategoryId = record.sub_category_id; delete mapped.sub_category_id; }\r\n      if (record.image_path !== undefined) { mapped.imagePath = record.image_path; delete mapped.image_path; }\r\n    } else if (table === 'users') {\r\n      if (record.created_at !== undefined) { mapped.createdAt = record.created_at; delete mapped.created_at; }\r\n      if (record.last_login !== undefined) { mapped.lastLogin = record.last_login; delete mapped.last_login; }\r\n    }\r\n    return mapped;"
);

// Fix 6: Normalize ID in upload + add users upload mapping
code = code.replace(
  "          const { sync_status, ...uploadData } = record;\r\n          \r\n          // استبدال أسماء الأعمدة",
  "          const { sync_status, ...uploadData } = record;\r\n          uploadData.id = String(record.id);\r\n          \r\n          // استبدال أسماء الأعمدة"
);

const returnsUpload = "          } else if (storeName === 'returns') {\r\n            uploadData.ref_invoice_id = record.refInvoiceId;\r\n            uploadData.shift_id = record.shiftId;\r\n            delete uploadData.refInvoiceId;\r\n            delete uploadData.shiftId;\r\n          }\r\n\r\n          batchData.push(uploadData);";
const returnsUploadFixed = "          } else if (storeName === 'returns') {\r\n            uploadData.ref_invoice_id = record.refInvoiceId;\r\n            uploadData.shift_id = record.shiftId;\r\n            delete uploadData.refInvoiceId;\r\n            delete uploadData.shiftId;\r\n          } else if (storeName === 'users') {\r\n            if (record.createdAt !== undefined) { uploadData.created_at = record.createdAt; delete uploadData.createdAt; }\r\n            if (record.lastLogin !== undefined) { uploadData.last_login = record.lastLogin; delete uploadData.lastLogin; }\r\n            delete uploadData.phone;\r\n            const effUser = uploadData.username || String(record.id);\r\n            if (!effUser || !uploadData.password) { console.warn('SyncManager: skip user ' + record.id + ': no username/password'); continue; }\r\n            uploadData.username = effUser;\r\n          }\r\n\r\n          batchData.push(uploadData);";
code = code.replace(returnsUpload, returnsUploadFixed);

// Fix 7: Normalize cloud ID in download loop
const downloadOld = "        for (const cloudItem of cloudUpdates) {\r\n          // جلب السجل المحلي الموجود للحفاظ على الحقول المحلية فقط (مثل minStock)\r\n          const existingLocal = await databaseManager.get(storeName, cloudItem.id);\r\n          \r\n          // تطبيع أسماء الأعمدة لتطابق واجهة React (تحويل من SnakeCase إلى CamelCase)\r\n          const localItem = {\r\n            ...(existingLocal || {}),\r\n            ...cloudItem,\r\n            sync_status: 'synced'\r\n          };";
const downloadNew = "        for (const cloudItem of cloudUpdates) {\r\n          if (cloudItem.id !== undefined && cloudItem.id !== null) cloudItem.id = String(cloudItem.id);\r\n          const existingLocal = await databaseManager.get(storeName, cloudItem.id);\r\n          const localItem = {\r\n            ...(existingLocal || {}),\r\n            ...cloudItem,\r\n            id: cloudItem.id,\r\n            sync_status: 'synced'\r\n          };";
code = code.replace(downloadOld, downloadNew);

// Fix 8: Add users download mapping
const returnsDownload = "          } else if (storeName === 'returns') {\r\n            localItem.refInvoiceId = cloudItem.ref_invoice_id;\r\n            localItem.shiftId = cloudItem.shift_id;\r\n            delete localItem.ref_invoice_id;\r\n            delete localItem.shift_id;\r\n          }\r\n\r\n          // حفظ محلياً في IndexedDB";
const returnsDownloadFixed = "          } else if (storeName === 'returns') {\r\n            localItem.refInvoiceId = cloudItem.ref_invoice_id;\r\n            localItem.shiftId = cloudItem.shift_id;\r\n            delete localItem.ref_invoice_id;\r\n            delete localItem.shift_id;\r\n          } else if (storeName === 'users') {\r\n            if (cloudItem.created_at !== undefined) { localItem.createdAt = cloudItem.created_at; delete localItem.created_at; }\r\n            if (cloudItem.last_login !== undefined) { localItem.lastLogin = cloudItem.last_login; delete localItem.last_login; }\r\n          }\r\n\r\n          // حفظ محلياً في IndexedDB";
code = code.replace(returnsDownload, returnsDownloadFixed);

fs.writeFileSync('./src/utils/syncManager.js', code, 'utf8');
console.log('Done! File size:', code.length, 'bytes');
// Verify key changes
console.log('users in INDEXEDDB_TABLES:', code.includes("'categories', 'users']"));
console.log('users upload mapping:', code.includes("storeName === 'users'") && code.includes("uploadData.created_at"));
console.log('ID normalize in download:', code.includes("cloudItem.id = String(cloudItem.id)"));
console.log('users download mapping:', code.includes("localItem.createdAt = cloudItem.created_at"));
