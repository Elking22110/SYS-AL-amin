// نظام معالجة الأخطاء المحسن
class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
    this.notificationCallback = null;
  }

  // تسجيل معالج الإشعارات
  setNotificationCallback(callback) {
    this.notificationCallback = callback;
  }

  // معالجة الأخطاء العامة
  handleError(error, context = '', severity = 'medium') {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: error.message || 'خطأ غير معروف',
      stack: error.stack,
      context,
      severity,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // إضافة للـ log
    this.errorLog.push(errorEntry);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift(); // إزالة أقدم خطأ
    }

    // حفظ في localStorage
    try {
      localStorage.setItem('error_log', JSON.stringify(this.errorLog));
    } catch (e) {
      console.warn('لا يمكن حفظ سجل الأخطاء');
    }

    // إظهار إشعار للمستخدم
    if (this.notificationCallback) {
      this.showUserNotification(error, severity);
    }

    // طباعة في console للـ development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${severity.toUpperCase()}] ${context}:`, error);
    }
  }

  // إظهار إشعار للمستخدم
  showUserNotification(error, severity) {
    let message = 'حدث خطأ غير متوقع';
    let type = 'error';

    // تخصيص الرسالة حسب نوع الخطأ
    if (error.message.includes('Network')) {
      message = 'مشكلة في الاتصال بالإنترنت';
    } else if (error.message.includes('Storage')) {
      message = 'مشكلة في حفظ البيانات';
    } else if (error.message.includes('Permission')) {
      message = 'ليس لديك صلاحية لهذا الإجراء';
    }

    // تغيير نوع الإشعار حسب الخطورة
    if (severity === 'low') {
      type = 'warning';
    } else if (severity === 'high') {
      type = 'error';
    }

    this.notificationCallback(message, type);
  }

  // معالجة أخطاء الشبكة
  handleNetworkError(error) {
    this.handleError(error, 'Network', 'high');
  }

  // معالجة أخطاء التخزين
  handleStorageError(error) {
    this.handleError(error, 'Storage', 'medium');
  }

  // معالجة أخطاء التحقق من الصلاحيات
  handlePermissionError(error) {
    this.handleError(error, 'Permission', 'high');
  }

  // معالجة أخطاء التحقق من البيانات
  handleValidationError(error) {
    this.handleError(error, 'Validation', 'low');
  }

  // الحصول على سجل الأخطاء
  getErrorLog() {
    return this.errorLog;
  }

  // مسح سجل الأخطاء
  clearErrorLog() {
    this.errorLog = [];
    try {
      localStorage.removeItem('error_log');
    } catch (e) {
      console.warn('لا يمكن مسح سجل الأخطاء');
    }
  }

  // إحصائيات الأخطاء
  getErrorStats() {
    const stats = {
      total: this.errorLog.length,
      bySeverity: {},
      byContext: {},
      recent: this.errorLog.slice(-10)
    };

    this.errorLog.forEach(error => {
      // إحصائيات حسب الخطورة
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      
      // إحصائيات حسب السياق
      stats.byContext[error.context] = (stats.byContext[error.context] || 0) + 1;
    });

    return stats;
  }

  // تصدير سجل الأخطاء
  exportErrorLog() {
    const data = {
      timestamp: new Date().toISOString(),
      stats: this.getErrorStats(),
      errors: this.errorLog
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-log-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// إنشاء instance واحد للنظام
const errorHandler = new ErrorHandler();

// معالجة الأخطاء غير المعالجة
window.addEventListener('error', (event) => {
  errorHandler.handleError(event.error, 'Unhandled', 'high');
});

window.addEventListener('unhandledrejection', (event) => {
  errorHandler.handleError(
    new Error(event.reason), 
    'Unhandled Promise Rejection', 
    'high'
  );
});

export default errorHandler;
