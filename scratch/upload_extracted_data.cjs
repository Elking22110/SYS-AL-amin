/**
 * رفع بيانات الورديات والمستخدمين إلى Supabase مباشرة
 */

const https = require('https');

const SUPABASE_KEY = 'sb_publishable_NZWEAHXuHWyBfPFwUgMahQ_Z3LHrg8k';

// بيانات مستخرجة من اللوكال هوست
const SHIFTS_DATA = [
  {"id":"SH-00000001","userId":"current_user","userName":"مستخدم","startTime":"2026-07-08T17:01:38.471Z","endTime":null,"status":"active","sales":[],"totalSales":0,"totalOrders":0,"cashDrawer":{"openingAmount":0,"closingAmount":0,"expectedAmount":0},"notes":""},
  {"id":"SH-00000002","userId":"current_user","userName":"مستخدم","startTime":"2026-07-08T17:01:57.191Z","endTime":null,"status":"active","sales":[],"totalSales":0,"totalOrders":0,"cashDrawer":{"openingAmount":0,"closingAmount":0,"expectedAmount":0},"notes":""},
  {"id":"SH-00000003","userId":1,"userName":"admin","startTime":"2026-07-08T17:02:15.049Z","endTime":null,"status":"active","sales":[],"totalSales":0,"totalOrders":0,"cashDrawer":{"openingAmount":0,"closingAmount":0,"expectedAmount":0},"notes":""},
  {"id":"SH-00000004","userId":"1","userName":"admin","startTime":"2026-07-08T17:02:28.684Z","endTime":null,"status":"active","sales":[],"totalSales":0,"totalOrders":0,"cashDrawer":{"openingAmount":0,"closingAmount":0,"expectedAmount":0},"notes":"Test diagnostic shift"},
  {"id":"SH-00000005","userId":1,"userName":"admin","startTime":"2026-07-08T17:02:37.355Z","endTime":null,"status":"active","sales":[],"totalSales":0,"totalOrders":0,"cashDrawer":{"openingAmount":0,"closingAmount":0,"expectedAmount":0},"notes":""},
  {"id":"SH-00000006","userId":"1","userName":"admin","startTime":"2026-07-08T17:02:39.725Z","endTime":null,"status":"active","sales":[],"totalSales":0,"totalOrders":0,"cashDrawer":{"openingAmount":0,"closingAmount":0,"expectedAmount":0},"notes":"Shift manually started via diagnostics"},
  {"id":"SH-00000007","userId":1,"userName":"admin","startTime":"2026-07-08T17:03:33.014Z","endTime":null,"status":"active","sales":[],"totalSales":0,"totalOrders":0,"cashDrawer":{"openingAmount":0,"closingAmount":0,"expectedAmount":0},"notes":""},
  {"id":"SH-00000008","userId":1,"userName":"admin","startTime":"2026-07-08T17:03:51.247Z","endTime":null,"status":"active","sales":[],"totalSales":0,"totalOrders":0,"cashDrawer":{"openingAmount":0,"closingAmount":0,"expectedAmount":0},"notes":""},
  {"id":"SH-00000010","userId":1,"userName":"admin","startTime":"2026-07-08T17:04:45.005Z","endTime":null,"status":"active","sales":[],"totalSales":0,"totalOrders":0,"cashDrawer":{"openingAmount":0,"closingAmount":0,"expectedAmount":0},"notes":""},
  {"id":"SH-00000011","userId":1,"userName":"admin","startTime":"2026-07-08T17:10:27.450Z","endTime":null,"status":"active","sales":[],"totalSales":0,"totalOrders":0,"cashDrawer":{"openingAmount":0,"closingAmount":0,"expectedAmount":0},"notes":""},
  {"id":"SH-00000012","userId":1,"userName":"admin","startTime":"2026-07-08T17:35:09.807Z","endTime":null,"status":"active","sales":[],"totalSales":0,"totalOrders":0,"cashDrawer":{"openingAmount":0,"closingAmount":0,"expectedAmount":0},"notes":""},
  {"id":"SH-00000013","userId":1,"userName":"admin","startTime":"2026-07-08T19:46:00.387Z","endTime":null,"status":"active","sales":[],"totalSales":0,"totalOrders":0,"cashDrawer":{"openingAmount":0,"closingAmount":0,"expectedAmount":0},"notes":""},
  {"id":"SH-00000014","userId":1,"userName":"admin","startTime":"2026-07-08T20:09:07.864Z","endTime":null,"status":"active","sales":[],"totalSales":0,"totalOrders":0,"cashDrawer":{"openingAmount":0,"closingAmount":0,"expectedAmount":0},"notes":""},
  {"id":"SH-00000015","userId":1,"userName":"admin","startTime":"2026-07-08T20:14:04.595Z","endTime":null,"status":"active","sales":[],"totalSales":0,"totalOrders":0,"cashDrawer":{"openingAmount":0,"closingAmount":0,"expectedAmount":0},"notes":""}
];

const USERS_DATA = [
  {"id":1,"name":"admin","email":"admin@admin.com","phone":"01000000000","role":"admin","status":"active","password":"2bc4f1780f289099a913e46240c5da05f2be310bd440293884e7dd61c8039d08","createdAt":"2026-07-08T16:57:49.186Z","lastLogin":"2026-07-08T16:57:49.186Z"},
  {"id":"admin","username":"admin","email":"admin@alaminstore.com","role":"admin","name":"المدير العام"}
];

function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'jwjjykrrnlnitelcgzfy.supabase.co',
      path: `/rest/v1/${path}`,
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      }
    };

    const req = https.request(options, (res) => {
      let respData = '';
      res.on('data', c => respData += c);
      res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body: respData }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('🚀 رفع البيانات إلى Supabase...\n');

  // رفع الورديات
  console.log(`📤 رفع ${SHIFTS_DATA.length} وردية...`);
  const shiftsToUpload = SHIFTS_DATA.map(s => ({
    id: String(s.id),
    status: s.status || 'active',
    start_time: s.startTime || null,
    end_time: s.endTime || null,
    opening_amount: Number(s.cashDrawer?.openingAmount) || 0,
    expected_amount: Number(s.cashDrawer?.expectedAmount) || 0,
    closing_amount: Number(s.cashDrawer?.closingAmount) || 0,
    cashier_username: String(s.userName || s.userId || 'admin'),
    sales_details: s.salesDetails || {},
    returns_data: s.returns || [],
    updated_at: new Date().toISOString()
  }));

  const shiftsResult = await apiRequest('POST', 'shifts', shiftsToUpload);
  if (shiftsResult.ok) {
    console.log(`  ✅ تم رفع ${SHIFTS_DATA.length} وردية بنجاح`);
  } else {
    console.error(`  ❌ خطأ في رفع الورديات: ${shiftsResult.status}`, shiftsResult.body.substring(0, 400));
  }

  // رفع المستخدمين
  console.log(`\n📤 رفع ${USERS_DATA.length} مستخدم...`);
  const usersToUpload = USERS_DATA.map(u => ({
    id: String(u.id),
    username: u.username || u.name || `user_${u.id}`,
    name: u.name || u.username || 'Admin',
    email: u.email || null,
    role: u.role || 'admin',
    password: u.password || 'hashed',
    status: u.status || 'active',
    created_at: u.createdAt || new Date().toISOString(),
    last_login: u.lastLogin || null,
    updated_at: new Date().toISOString()
  }));

  const usersResult = await apiRequest('POST', 'users', usersToUpload);
  if (usersResult.ok) {
    console.log(`  ✅ تم رفع ${USERS_DATA.length} مستخدم بنجاح`);
  } else {
    console.error(`  ❌ خطأ في رفع المستخدمين: ${usersResult.status}`, usersResult.body.substring(0, 400));
  }

  // فحص النتائج
  console.log('\n📊 النتائج في Supabase:');
  for (const table of ['shifts', 'users', 'customers', 'sales']) {
    await new Promise(resolve => {
      https.get(`https://jwjjykrrnlnitelcgzfy.supabase.co/rest/v1/${table}?select=*`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'count=exact', 'Range': '0-0' }
      }, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          const total = (res.headers['content-range'] || '*/0').split('/')[1];
          console.log(`   ${table.padEnd(15)} -> ${total} صف`);
          resolve();
        });
      }).on('error', () => resolve());
    });
  }
}

main().catch(console.error);
