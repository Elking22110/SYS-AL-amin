const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/utils/syncManager.js');
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = `// جلب تواريخ التحديث السحابية للسجلات المعلقة للتحقق من وجود تعارضات (Last-Write-Wins)`;
const endMarker = `// معالجة المرتجعات والمحذوفات في السحاب`;

let startIndex = content.indexOf(startMarker);
let endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find start or end markers!");
  console.log("start:", startIndex, "end:", endIndex);
  process.exit(1);
}

// Backtrack to the start of the line for startMarker
while (startIndex > 0 && content[startIndex - 1] !== '\n') {
  startIndex--;
}

// Backtrack to the start of the line for endMarker
while (endIndex > 0 && content[endIndex - 1] !== '\n') {
  endIndex--;
}

const replacement = `      // جلب تواريخ التحديث السحابية للسجلات المعلقة للتحقق من وجود تعارضات (Last-Write-Wins)
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
          console.warn(\`فشل التحقق من تعارضات السحابة لـ \${storeName}، سيتم الرفع المباشر:\`, err);
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
            console.warn(\`⚠️ تعارض لجدول \${storeName} الصنف \${record.id}: النسخة السحابية أحدث. سيتم تخطي الرفع وتغليب السحاب.\`);
            continue;
          }

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
            uploadData.closing_amount = record.closing_amount || 0;
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

          batchData.push(uploadData);
          originalRecordsMap.set(String(record.id), record);
        }

        // تقسيم البيانات إلى دفعات (مثلاً كل دفعة 200 سجل) لتجنب تجاوز قيود حجم الطلب
        const batchSize = 200;
        for (let i = 0; i < batchData.length; i += batchSize) {
          const chunk = batchData.slice(i, i + batchSize);
          let { error } = await supabase.from(storeName).upsert(chunk);
          
          // في حال فشل الدفعة بسبب عمود مفقود (PGRST204) أو غيره، نقوم بالرفع الفردي التراجعي كاحتياط
          if (error) {
            console.warn(\`⚠️ [SyncManager] فشل رفع دفعة لـ \${storeName}، الانتقال للرفع الفردي التراجعي...\`, error);
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
                console.error(\`❌ خطأ في رفع الصنف \${singleUploadData.id} في جدول \${storeName}:\`, singleError);
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
            console.log(\`✅ [SyncManager] تم رفع دفعة من \${chunk.length} سجل بنجاح في جدول \${storeName}\`);
          }
        }
      }

`;

const updatedContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync(filePath, updatedContent, 'utf8');
console.log("Successfully optimized syncManager.js with index-based batching!");
