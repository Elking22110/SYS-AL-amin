// نظام حماية من XSS و CSRF وتشفير البيانات بـ AES/SHA-256
import { getCurrentDate } from './dateUtils.js';
import CryptoJS from 'crypto-js';

export class SecurityManager {
  constructor() {
    this.csrfToken = this.generateCSRFToken();
    this.xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
      /<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi,
      /<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<img[^>]+src[^>]*>/gi,
      /<a[^>]+href[^>]*>/gi
    ];
  }

  // توليد CSRF Token
  generateCSRFToken() {
    const array = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      // Fallback for environments without crypto
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // تنظيف البيانات من XSS
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    let sanitized = input;

    // إزالة الأنماط الخطيرة
    this.xssPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // تنظيف HTML entities
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    return sanitized;
  }

  // التحقق من CSRF Token
  validateCSRFToken(token) {
    return token === this.csrfToken;
  }

  // تنظيف البيانات المتداخلة
  sanitizeObject(obj) {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[this.sanitizeInput(key)] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return this.sanitizeInput(obj);
  }

  // المفتاح السري الثابت للتشفير الداخلي (يجب تغييره في بيئة الإنتاج وجعله متغيراً بيئياً)
  _secretKey = 'PosSyst3m_Sup3r_S3cr3t_K3y_2026!@#';

  // تشفير البيانات الحساسة (تشفير ذو اتجاهين - AES)
  encryptSensitiveData(data) {
    try {
      const jsonString = JSON.stringify(data);
      // تشفير باستخدام مكتبة crypto-js ببروتوكول AES
      const encrypted = CryptoJS.AES.encrypt(jsonString, this._secretKey).toString();
      return encrypted;
    } catch (error) {
      console.error('خطأ في التشفير:', error);
      return null;
    }
  }

  // فك تشفير البيانات الحساسة (AES)
  decryptSensitiveData(encryptedData) {
    try {
      if (!encryptedData) return null;
      // فك التشفير باستخدام نفس المفتاح السري
      const bytes = CryptoJS.AES.decrypt(encryptedData, this._secretKey);
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

      if (!decryptedString) {
        throw new Error('فشل فك التشفير: قد تكون البيانات تالفة أو المفتاح غير صحيح');
      }

      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('خطأ في فك التشفير:', error);
      return null;
    }
  }

  // تكويد كلمة المرور بتشفير غير عكسي (Hashing - SHA-256)
  hashPassword(password) {
    if (!password) return '';
    // إضافة "بهارات" (Salting) لزيادة أمان التجزئة
    const salt = 'M3n5F@shi0n_S@lt_';
    return CryptoJS.SHA256(salt + password).toString(CryptoJS.enc.Hex);
  }

  // التحقق من صحة البيانات
  validateData(data, schema) {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];

      if (rules.required && (!value || value.toString().trim() === '')) {
        errors.push(`${field} مطلوب`);
        continue;
      }

      if (value && rules.type) {
        if (rules.type === 'email' && !this.isValidEmail(value)) {
          errors.push(`${field} يجب أن يكون بريد إلكتروني صحيح`);
        }

        if (rules.type === 'phone' && !this.isValidPhone(value)) {
          errors.push(`${field} يجب أن يكون رقم هاتف صحيح`);
        }

        if (rules.type === 'number' && isNaN(value)) {
          errors.push(`${field} يجب أن يكون رقماً`);
        }

        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`${field} يجب أن يكون ${rules.minLength} أحرف على الأقل`);
        }

        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${field} يجب أن يكون ${rules.maxLength} أحرف على الأكثر`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // التحقق من صحة البريد الإلكتروني
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // التحقق من صحة رقم الهاتف
  isValidPhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  // تسجيل محاولات الأمان المشبوهة
  logSecurityEvent(event, details = {}) {
    const securityLog = {
      timestamp: getCurrentDate(),
      event,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href,
      ip: 'localhost' // في التطبيق الحقيقي، سيتم الحصول على IP الحقيقي
    };

    // حفظ في localStorage
    const logs = JSON.parse(localStorage.getItem('security_logs') || '[]');
    logs.push(securityLog);

    // الاحتفاظ بآخر 500 سجل أمان فقط
    if (logs.length > 500) {
      logs.splice(0, logs.length - 500);
    }

    localStorage.setItem('security_logs', JSON.stringify(logs));

    // في التطبيق الحقيقي، سيتم إرسال السجلات للخادم
    console.warn('حدث أمني:', securityLog);
  }

  // حماية من SQL Injection (للمدخلات النصية)
  escapeSQLInput(input) {
    if (typeof input !== 'string') return input;

    return input
      .replace(/'/g, "''")
      .replace(/;/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '')
      .replace(/xp_/gi, '')
      .replace(/sp_/gi, '');
  }

  // إنشاء كلمة مرور قوية
  generateStrongPassword(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return password;
  }

  // التحقق من قوة كلمة المرور
  validatePasswordStrength(password) {
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    const score = Object.values(checks).filter(Boolean).length;

    return {
      score,
      strength: score < 3 ? 'ضعيف' : score < 4 ? 'متوسط' : score < 5 ? 'قوي' : 'قوي جداً',
      checks
    };
  }
}

// إنشاء instance واحد للنظام
export const securityManager = new SecurityManager();

// دالة مساعدة لتنظيف البيانات
export const sanitizeData = (data) => {
  return securityManager.sanitizeObject(data);
};

// دالة مساعدة للتحقق من البيانات
export const validateData = (data, schema) => {
  return securityManager.validateData(data, schema);
};

// دالة مساعدة لتشفير البيانات
export const encryptData = (data) => {
  return securityManager.encryptSensitiveData(data);
};

// دالة مساعدة لفك تشفير البيانات
export const decryptData = (data) => {
  return securityManager.decryptSensitiveData(data);
};

// دالة مساعدة لتشفير كلمات المرور (Hashing)
export const hashPassword = (password) => {
  return securityManager.hashPassword(password);
};
