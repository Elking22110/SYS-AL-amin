// تنظيف الورديات القديمة
const fs = require('fs');
const path = require('path');

console.log('جاري تنظيف الورديات القديمة...');

try {
  // قراءة البيانات من localStorage
  const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
  
  if (data.shifts) {
    const originalCount = data.shifts.length;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // إزالة الورديات الأقدم من 30 يوم
    const recentShifts = data.shifts.filter(shift => {
      const shiftDate = new Date(shift.startTime);
      return shiftDate > thirtyDaysAgo;
    });
    
    data.shifts = recentShifts;
    
    // حفظ البيانات المحدثة
    fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
    
    console.log(`تم تنظيف ${originalCount - recentShifts.length} وردية قديمة`);
    console.log(`بقي ${recentShifts.length} وردية`);
  } else {
    console.log('لا توجد ورديات للتنظيف');
  }
} catch (error) {
  console.error('خطأ في تنظيف الورديات:', error.message);
}
