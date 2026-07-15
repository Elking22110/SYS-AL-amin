/**
 * force_sync_to_supabase.cjs
 * يقرأ الداتا الموجودة في متصفح الكمبيوتر ويرفعها مباشرة لـ Supabase
 * الاستخدام: node scratch/force_sync_to_supabase.cjs
 */

const https = require('https');

const SUPABASE_URL = 'https://jwjjykrrnlnitelcgzfy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_NZWEAHXuHWyBfPFwUgMahQ_Z3LHrg8k';

// =========================================================
// 🔹 بيانات تجريبية: استبدلها بالنسخ الفعلية من المتصفح
// =========================================================
// تعليمات:
// 1. افتح المتصفح على موقع فيرسل أو localhost
// 2. افتح Developer Tools (F12) -> Console
// 3. انسخ هذا الكود والصقه في الكونسول:
//    JSON.stringify({ customers: JSON.parse(localStorage.getItem('customers')||'[]'), sales: JSON.parse(localStorage.getItem('sales')||'[]'), shifts: JSON.parse(localStorage.getItem('shifts')||'[]'), returns: JSON.parse(localStorage.getItem('returns')||'[]'), users: JSON.parse(localStorage.getItem('users')||'[]') })
// 4. انسخ الناتج واستبدل محتوى DATA_FROM_BROWSER أدناه

const DATA_FROM_BROWSER = null; // ← ضع هنا الداتا المنسوخة من الكونسول

// =========================================================

function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'jwjjykrrnlnitelcgzfy.supabase.co',
      path: `/rest/v1/${path}`,
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      }
    };
    if (data) options.headers['Content-Length'] = Buffer.byteLength(data);

    const req = https.request(options, (res) => {
      let respData = '';
      res.on('data', c => respData += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true, status: res.statusCode, body: respData });
        } else {
          resolve({ ok: false, status: res.statusCode, body: respData });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// رفع العملاء (customers)
async function uploadCustomers(customers) {
  if (!customers || customers.length === 0) {
    console.log('⚠️ لا توجد بيانات عملاء للرفع');
    return;
  }
  console.log(`\n📤 رفع ${customers.length} عميل إلى Supabase...`);
  
  // تحويل CamelCase إلى snake_case
  const mapped = customers.map(c => ({
    id: String(c.id),
    name: c.name || 'بدون اسم',
    phone: c.phone || null,
    email: c.email || null,
    address: c.address || null,
    type: c.type || 'عميل عادي',
    status: c.status || 'نشط',
    debt: Number(c.debt) || 0,
    total_spent: Number(c.totalSpent || c.total_spent) || 0,
    last_visit: c.lastVisit || c.last_visit || null,
    join_date: c.joinDate || c.join_date || null,
    updated_at: c.updated_at || new Date().toISOString()
  }));

  // رفع على دفعات 50
  const batchSize = 50;
  let uploaded = 0;
  for (let i = 0; i < mapped.length; i += batchSize) {
    const batch = mapped.slice(i, i + batchSize);
    const result = await apiRequest('POST', 'customers', batch);
    if (result.ok) {
      uploaded += batch.length;
      process.stdout.write(`\r  ✅ تم رفع ${uploaded}/${mapped.length} عميل`);
    } else {
      console.error(`\n  ❌ خطأ في رفع دفعة العملاء [${i}-${i+batchSize}]:`, result.body.substring(0, 300));
    }
  }
  console.log(`\n  ✅ تم رفع العملاء بنجاح: ${uploaded}/${mapped.length}`);
}

// رفع الفواتير (sales)
async function uploadSales(sales) {
  if (!sales || sales.length === 0) {
    console.log('⚠️ لا توجد فواتير للرفع');
    return;
  }
  console.log(`\n📤 رفع ${sales.length} فاتورة إلى Supabase...`);
  
  const mapped = sales.map(s => ({
    id: String(s.id),
    date: s.date || null,
    timestamp: s.timestamp || new Date().toISOString(),
    shift_id: s.shiftId || s.shift_id || null,
    customer_id: s.customerId || s.customer_id || null,
    items: s.items || [],
    total: Number(s.total) || 0,
    discount_amount: Number(s.discountAmount || s.discount_amount) || 0,
    tax_amount: Number(s.taxAmount || s.tax_amount) || 0,
    payment_method: s.paymentMethod || s.payment_method || 'cash',
    payment_status: s.paymentStatus || s.payment_status || 'complete',
    down_payment: s.downPayment || s.down_payment || {},
    customer: s.customer || {},
    updated_at: s.updated_at || new Date().toISOString()
  }));

  const batchSize = 50;
  let uploaded = 0;
  for (let i = 0; i < mapped.length; i += batchSize) {
    const batch = mapped.slice(i, i + batchSize);
    const result = await apiRequest('POST', 'sales', batch);
    if (result.ok) {
      uploaded += batch.length;
      process.stdout.write(`\r  ✅ تم رفع ${uploaded}/${mapped.length} فاتورة`);
    } else {
      console.error(`\n  ❌ خطأ في رفع دفعة الفواتير [${i}-${i+batchSize}]:`, result.body.substring(0, 300));
    }
  }
  console.log(`\n  ✅ تم رفع الفواتير بنجاح: ${uploaded}/${mapped.length}`);
}

// رفع الورديات (shifts)
async function uploadShifts(shifts) {
  if (!shifts || shifts.length === 0) {
    console.log('⚠️ لا توجد ورديات للرفع');
    return;
  }
  console.log(`\n📤 رفع ${shifts.length} وردية إلى Supabase...`);
  
  const mapped = shifts.map(s => ({
    id: String(s.id),
    status: s.status || 'closed',
    start_time: s.startTime || s.start_time || null,
    end_time: s.endTime || s.end_time || null,
    opening_amount: Number(s.cashDrawer?.openingAmount || s.opening_amount) || 0,
    expected_amount: Number(s.cashDrawer?.expectedAmount || s.expected_amount) || 0,
    closing_amount: Number(s.cashDrawer?.closingAmount || s.closing_amount) || 0,
    cashier_username: s.cashier?.username || s.cashier_username || 'unknown',
    sales_details: s.salesDetails || s.sales_details || {},
    returns_data: s.returns || s.returns_data || [],
    updated_at: s.updated_at || new Date().toISOString()
  }));

  const result = await apiRequest('POST', 'shifts', mapped);
  if (result.ok) {
    console.log(`  ✅ تم رفع ${mapped.length} وردية بنجاح`);
  } else {
    console.error(`  ❌ خطأ في رفع الورديات:`, result.body.substring(0, 300));
  }
}

// رفع المرتجعات (returns)
async function uploadReturns(returns) {
  if (!returns || returns.length === 0) {
    console.log('⚠️ لا توجد مرتجعات للرفع');
    return;
  }
  console.log(`\n📤 رفع ${returns.length} مرتجع إلى Supabase...`);
  
  const mapped = returns.map(r => ({
    id: String(r.id),
    date: r.date || null,
    timestamp: r.timestamp || new Date().toISOString(),
    ref_invoice_id: r.refInvoiceId || r.ref_invoice_id || null,
    shift_id: r.shiftId || r.shift_id || null,
    customer: r.customer || {},
    item: r.item || {},
    amount: Number(r.amount) || 0,
    updated_at: r.updated_at || new Date().toISOString()
  }));

  const result = await apiRequest('POST', 'returns', mapped);
  if (result.ok) {
    console.log(`  ✅ تم رفع ${mapped.length} مرتجع بنجاح`);
  } else {
    console.error(`  ❌ خطأ في رفع المرتجعات:`, result.body.substring(0, 300));
  }
}

// رفع المستخدمين (users)
async function uploadUsers(users) {
  if (!users || users.length === 0) {
    console.log('⚠️ لا توجد بيانات مستخدمين للرفع');
    return;
  }
  console.log(`\n📤 رفع ${users.length} مستخدم إلى Supabase...`);
  
  const mapped = users.map(u => ({
    id: String(u.id),
    username: u.username || u.name || `user_${u.id}`,
    name: u.name || u.username || null,
    email: u.email || null,
    role: u.role || 'cashier',
    password: u.password || 'hashed_password',
    status: u.status || 'active',
    created_at: u.createdAt || u.created_at || new Date().toISOString(),
    last_login: u.lastLogin || u.last_login || null,
    updated_at: u.updated_at || new Date().toISOString()
  }));

  const result = await apiRequest('POST', 'users', mapped);
  if (result.ok) {
    console.log(`  ✅ تم رفع ${mapped.length} مستخدم بنجاح`);
  } else {
    console.error(`  ❌ خطأ في رفع المستخدمين:`, result.body.substring(0, 300));
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 أداة رفع البيانات القسري إلى Supabase');
  console.log('='.repeat(60));

  if (!DATA_FROM_BROWSER) {
    console.log('\n⚠️  لم يتم تحديد البيانات بعد!');
    console.log('\n📋 تعليمات استخراج البيانات من المتصفح:');
    console.log('   1. افتح متصفحك على موقع فيرسل: https://pos-main-ms.vercel.app');
    console.log('   2. اضغط F12 لفتح Developer Tools');
    console.log('   3. اضغط على تبويب Console');
    console.log('   4. انسخ الكود التالي والصقه في الكونسول:');
    console.log('\n   ' + '-'.repeat(50));
    console.log(`   JSON.stringify({
     customers: JSON.parse(localStorage.getItem('customers')||'[]'),
     sales: JSON.parse(localStorage.getItem('sales')||'[]'),
     shifts: JSON.parse(localStorage.getItem('shifts')||'[]'),
     returns: JSON.parse(localStorage.getItem('returns')||'[]'),
     users: JSON.parse(localStorage.getItem('users')||'[]')
   })`);
    console.log('   ' + '-'.repeat(50));
    console.log('\n   5. انسخ الناتج (السلسلة النصية الطويلة)');
    console.log('   6. افتح الملف: scratch/force_sync_to_supabase.cjs');
    console.log('   7. استبدل قيمة DATA_FROM_BROWSER بالناتج المنسوخ');
    console.log('   8. شغّل الأمر مرة أخرى: node scratch/force_sync_to_supabase.cjs');
    console.log('\n' + '='.repeat(60));
    return;
  }

  let data;
  try {
    data = typeof DATA_FROM_BROWSER === 'string' ? JSON.parse(DATA_FROM_BROWSER) : DATA_FROM_BROWSER;
  } catch (e) {
    console.error('❌ خطأ في قراءة البيانات:', e.message);
    return;
  }

  await uploadCustomers(data.customers);
  await uploadSales(data.sales);
  await uploadShifts(data.shifts);
  await uploadReturns(data.returns);
  await uploadUsers(data.users);

  console.log('\n' + '='.repeat(60));
  console.log('✅ تم الانتهاء من رفع جميع البيانات!');
  console.log('='.repeat(60));
  
  // فحص الأعداد النهائية
  console.log('\n📊 فحص السجلات في Supabase الآن:');
  const tables = ['customers', 'sales', 'shifts', 'returns', 'users'];
  for (const table of tables) {
    const r = await new Promise((resolve) => {
      const req = https.get(`https://jwjjykrrnlnitelcgzfy.supabase.co/rest/v1/${table}?select=*`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'count=exact', 'Range': '0-0' }
      }, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve({ table, range: res.headers['content-range'] || 'unknown' }));
      });
      req.on('error', e => resolve({ table, range: 'error: ' + e.message }));
    });
    const total = r.range.split('/')[1];
    console.log(`   ${table.padEnd(20)} -> ${total} صف`);
  }
}

main().catch(console.error);
