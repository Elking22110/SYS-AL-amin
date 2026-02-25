// إصلاح الفواتير
const fs = require('fs');
const path = require('path');

console.log('جاري إصلاح الفواتير...');

try {
  // قراءة البيانات من localStorage
  const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
  
  if (data.sales) {
    let fixedCount = 0;
    
    // إصلاح الفواتير
    data.sales.forEach(sale => {
      // إصلاح التواريخ
      if (!sale.date) {
        sale.date = new Date().toISOString();
        fixedCount++;
      }
      
      // إصلاح الأرقام
      if (typeof sale.total === 'string') {
        sale.total = parseFloat(sale.total) || 0;
        fixedCount++;
      }
      
      // إصلاح العناصر
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach(item => {
          if (typeof item.price === 'string') {
            item.price = parseFloat(item.price) || 0;
            fixedCount++;
          }
          if (typeof item.quantity === 'string') {
            item.quantity = parseInt(item.quantity) || 0;
            fixedCount++;
          }
        });
      }
    });
    
    // حفظ البيانات المحدثة
    fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
    
    console.log(`تم إصلاح ${fixedCount} مشكلة في الفواتير`);
  } else {
    console.log('لا توجد فواتير للإصلاح');
  }
} catch (error) {
  console.error('خطأ في إصلاح الفواتير:', error.message);
}
