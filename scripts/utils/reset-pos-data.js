// إعادة تعيين بيانات النظام
const fs = require('fs');
const path = require('path');

console.log('جاري إعادة تعيين بيانات النظام...');

try {
  // إنشاء بيانات افتراضية
  const defaultData = {
    products: [],
    customers: [],
    sales: [],
    shifts: [],
    users: [
      {
        id: '1',
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        name: 'المدير',
        email: 'admin@example.com',
        phone: '01009970416',
        createdAt: new Date().toISOString()
      }
    ],
    storeInfo: {
      name: 'إبراهيم العراقي',
      phone: '01009970416',
      address: 'العنوان',
      logo: null,
      currency: 'جنيه',
      taxRate: 0,
      discountRate: 0
    },
    settings: {
      theme: 'dark',
      language: 'ar',
      currency: 'جنيه',
      taxRate: 0,
      discountRate: 0,
      autoBackup: true,
      backupInterval: 24
    }
  };
  
  // حفظ البيانات الافتراضية
  fs.writeFileSync('data.json', JSON.stringify(defaultData, null, 2));
  
  console.log('تم إعادة تعيين بيانات النظام بنجاح');
  console.log('اسم المستخدم: admin');
  console.log('كلمة المرور: admin123');
} catch (error) {
  console.error('خطأ في إعادة تعيين البيانات:', error.message);
}
