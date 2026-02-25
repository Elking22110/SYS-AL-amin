// مساعد التواريخ - تحويل إلى النظام الميلادي مع 12 ساعة
const monthNames = {
  'January': 'يناير', 'February': 'فبراير', 'March': 'مارس', 'April': 'أبريل',
  'May': 'مايو', 'June': 'يونيو', 'July': 'يوليو', 'August': 'أغسطس',
  'September': 'سبتمبر', 'October': 'أكتوبر', 'November': 'نوفمبر', 'December': 'ديسمبر'
};

const dayNames = {
  'Sunday': 'الأحد', 'Monday': 'الاثنين', 'Tuesday': 'الثلاثاء', 'Wednesday': 'الأربعاء',
  'Thursday': 'الخميس', 'Friday': 'الجمعة', 'Saturday': 'السبت'
};

// دالة ترجمة التواريخ والأوقات للعربية
const translateToArabic = (text) => {
  let translated = text;
  
  // ترجمة أسماء الشهور
  Object.keys(monthNames).forEach(english => {
    const arabic = monthNames[english];
    translated = translated.replace(new RegExp(english, 'g'), arabic);
  });
  
  // ترجمة أسماء الأيام
  Object.keys(dayNames).forEach(english => {
    const arabic = dayNames[english];
    translated = translated.replace(new RegExp(english, 'g'), arabic);
  });
  
  // ترجمة AM/PM
  translated = translated.replace(/AM/g, 'ص');
  translated = translated.replace(/PM/g, 'م');
  
  return translated;
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    
    // التحقق من صحة التاريخ
    if (isNaN(date.getTime())) {
      return dateString; // إرجاع النص الأصلي إذا كان التاريخ غير صحيح
    }
    
    // تنسيق التاريخ الميلادي
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true // استخدام نظام 12 ساعة
    };
    
    const formatted = date.toLocaleDateString('en-US', options);
    return formatted;
  } catch (error) {
    console.warn('خطأ في تنسيق التاريخ:', error);
    return dateString;
  }
};

// تنسيق التاريخ فقط (بدون وقت)
export const formatDateOnly = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return dateString;
    }
    
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    const formatted = date.toLocaleDateString('en-US', options);
    return formatted;
  } catch (error) {
    console.warn('خطأ في تنسيق التاريخ:', error);
    return dateString;
  }
};

// تنسيق الوقت فقط (12 ساعة)
export const formatTimeOnly = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return dateString;
    }
    
    const options = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    
    const formatted = date.toLocaleTimeString('en-US', options);
    return formatted;
  } catch (error) {
    console.warn('خطأ في تنسيق الوقت:', error);
    return dateString;
  }
};

// تنسيق التاريخ والوقت معاً
export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return dateString;
    }
    
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    
    const formatted = date.toLocaleDateString('en-US', options);
    return formatted;
  } catch (error) {
    console.warn('خطأ في تنسيق التاريخ والوقت:', error);
    return dateString;
  }
};

// تنسيق التاريخ القصير (يوم/شهر/سنة)
export const formatShortDate = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return dateString;
    }
    
    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };
    
    const formatted = date.toLocaleDateString('en-US', options);
    return formatted;
  } catch (error) {
    console.warn('خطأ في تنسيق التاريخ القصير:', error);
    return dateString;
  }
};

// الحصول على التاريخ الحالي
export const getCurrentDate = () => {
  return new Date().toISOString();
};

// الحصول على التاريخ المحلي بتنسيق YYYY-MM-DD
export const getLocalDateString = () => {
  const now = new Date();
  return now.getFullYear() + '-' + 
         String(now.getMonth() + 1).padStart(2, '0') + '-' + 
         String(now.getDate()).padStart(2, '0');
};

// الحصول على التاريخ المحلي بتنسيق DD/MM/YYYY
export const getLocalDateFormatted = () => {
  const now = new Date();
  return String(now.getDate()).padStart(2, '0') + '/' + 
         String(now.getMonth() + 1).padStart(2, '0') + '/' + 
         now.getFullYear();
};

// تحويل التاريخ من YYYY-MM-DD إلى DD/MM/YYYY
export const formatDateToDDMMYYYY = (dateString) => {
  if (!dateString) return '';
  
  try {
    const [year, month, day] = dateString.split('-');
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  } catch (error) {
    console.warn('خطأ في تحويل التاريخ:', error);
    return dateString;
  }
};

// تحويل التاريخ من DD/MM/YYYY إلى YYYY-MM-DD
export const formatDateToYYYYMMDD = (dateString) => {
  if (!dateString) return '';
  
  try {
    const [day, month, year] = dateString.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } catch (error) {
    console.warn('خطأ في تحويل التاريخ:', error);
    return dateString;
  }
};

// الحصول على التاريخ الحالي بتنسيق عربي
export const getCurrentDateFormatted = () => {
  return formatDate(getCurrentDate());
};

// التحقق من صحة التاريخ
export const isValidDate = (dateString) => {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch (error) {
    return false;
  }
};

// مقارنة التواريخ
export const compareDates = (date1, date2) => {
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
      return 0;
    }
    
    return d1.getTime() - d2.getTime();
  } catch (error) {
    return 0;
  }
};

// إضافة أيام للتاريخ
export const addDays = (dateString, days) => {
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return dateString;
    }
    
    date.setDate(date.getDate() + days);
    return date.toISOString();
  } catch (error) {
    return dateString;
  }
};

// الحصول على بداية اليوم
export const getStartOfDay = (dateString) => {
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return dateString;
    }
    
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  } catch (error) {
    return dateString;
  }
};

// الحصول على نهاية اليوم
export const getEndOfDay = (dateString) => {
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return dateString;
    }
    
    date.setHours(23, 59, 59, 999);
    return date.toISOString();
  } catch (error) {
    return dateString;
  }
};

// تنسيق اسم اليوم
export const formatWeekday = (dateString) => {
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return dateString;
    }
    
    const formatted = date.toLocaleDateString('en-US', { weekday: 'long' });
    return formatted;
  } catch (error) {
    return dateString;
  }
};

// دالة لتنظيف البيانات الموجودة من التواريخ الهجرية
export const cleanExistingData = () => {
  try {
    // تنظيف بيانات المبيعات
    const sales = JSON.parse(localStorage.getItem('sales') || '[]');
    const cleanedSales = sales.map(sale => ({
      ...sale,
      date: getCurrentDate(),
      timestamp: formatDateTime(getCurrentDate())
    }));
    localStorage.setItem('sales', JSON.stringify(cleanedSales));

    // تنظيف بيانات الورديات
    const shifts = JSON.parse(localStorage.getItem('shifts') || '[]');
    const cleanedShifts = shifts.map(shift => ({
      ...shift,
      startTime: getCurrentDate(),
      endTime: shift.endTime ? getCurrentDate() : null
    }));
    localStorage.setItem('shifts', JSON.stringify(cleanedShifts));

    // تنظيف بيانات النسخ الاحتياطية
    const backups = JSON.parse(localStorage.getItem('backups') || '[]');
    const cleanedBackups = backups.map(backup => ({
      ...backup,
      date: getCurrentDate()
    }));
    localStorage.setItem('backups', JSON.stringify(cleanedBackups));

    console.log('تم تنظيف البيانات من التواريخ الهجرية');
  } catch (error) {
    console.error('خطأ في تنظيف البيانات:', error);
  }
};

export default {
  formatDate,
  formatDateOnly,
  formatTimeOnly,
  formatDateTime,
  formatShortDate,
  getCurrentDate,
  getCurrentDateFormatted,
  isValidDate,
  compareDates,
  addDays,
  getStartOfDay,
  getEndOfDay,
  formatWeekday,
  cleanExistingData
};

