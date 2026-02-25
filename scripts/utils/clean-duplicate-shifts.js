// تنظيف الورديات المكررة
const fs = require('fs');
const path = require('path');

console.log('جاري تنظيف الورديات المكررة...');

try {
  // قراءة البيانات من localStorage
  const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
  
  if (data.shifts) {
    const originalCount = data.shifts.length;
    
    // إزالة الورديات المكررة
    const uniqueShifts = data.shifts.filter((shift, index, self) => 
      index === self.findIndex(s => s.id === shift.id)
    );
    
    data.shifts = uniqueShifts;
    
    // حفظ البيانات المحدثة
    fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
    
    console.log(`تم تنظيف ${originalCount - uniqueShifts.length} وردية مكررة`);
    console.log(`بقي ${uniqueShifts.length} وردية`);
  } else {
    console.log('لا توجد ورديات للتنظيف');
  }
} catch (error) {
  console.error('خطأ في تنظيف الورديات:', error.message);
}
