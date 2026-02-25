// إصلاح الورديات النشطة
const fs = require('fs');
const path = require('path');

console.log('جاري إصلاح الورديات النشطة...');

try {
  // قراءة البيانات من localStorage
  const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
  
  if (data.shifts) {
    let fixedCount = 0;
    
    // إصلاح الورديات النشطة
    data.shifts.forEach(shift => {
      if (shift.status === 'active') {
        // التحقق من أن الوردية لا تزال نشطة
        const now = new Date();
        const shiftStart = new Date(shift.startTime);
        const hoursDiff = (now - shiftStart) / (1000 * 60 * 60);
        
        // إذا كانت الوردية أقدم من 24 ساعة، قم بإنهائها
        if (hoursDiff > 24) {
          shift.status = 'ended';
          shift.endTime = new Date().toISOString();
          fixedCount++;
        }
      }
    });
    
    // حفظ البيانات المحدثة
    fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
    
    console.log(`تم إصلاح ${fixedCount} وردية نشطة`);
  } else {
    console.log('لا توجد ورديات للإصلاح');
  }
} catch (error) {
  console.error('خطأ في إصلاح الورديات:', error.message);
}
