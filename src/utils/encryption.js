// نظام التشفير للبيانات الحساسة
import CryptoJS from 'crypto-js';

class EncryptionManager {
  constructor() {
    // مفتاح التشفير - يجب أن يكون آمن في الإنتاج
    this.secretKey = this.getOrCreateSecretKey();
  }

  // الحصول على أو إنشاء مفتاح التشفير
  getOrCreateSecretKey() {
    let key = localStorage.getItem('encryption_key');
    if (!key) {
      // إنشاء مفتاح جديد عشوائي
      key = CryptoJS.lib.WordArray.random(256/8).toString();
      localStorage.setItem('encryption_key', key);
    }
    return key;
  }

  // تشفير النص
  encrypt(text) {
    try {
      if (!text) return text;
      const encrypted = CryptoJS.AES.encrypt(text, this.secretKey).toString();
      return encrypted;
    } catch (error) {
      console.error('خطأ في التشفير:', error);
      return text;
    }
  }

  // فك التشفير
  decrypt(encryptedText) {
    try {
      if (!encryptedText) return encryptedText;
      const decrypted = CryptoJS.AES.decrypt(encryptedText, this.secretKey).toString(CryptoJS.enc.Utf8);
      return decrypted;
    } catch (error) {
      console.error('خطأ في فك التشفير:', error);
      return encryptedText;
    }
  }

  // تشفير كائن
  encryptObject(obj) {
    try {
      if (!obj) return obj;
      const jsonString = JSON.stringify(obj);
      return this.encrypt(jsonString);
    } catch (error) {
      console.error('خطأ في تشفير الكائن:', error);
      return obj;
    }
  }

  // فك تشفير كائن
  decryptObject(encryptedObj) {
    try {
      if (!encryptedObj) return encryptedObj;
      const decryptedString = this.decrypt(encryptedObj);
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('خطأ في فك تشفير الكائن:', error);
      return encryptedObj;
    }
  }

  // تشفير البيانات الحساسة في كائن
  encryptSensitiveData(obj, sensitiveFields = []) {
    try {
      if (!obj) return obj;
      
      const encryptedObj = { ...obj };
      
      sensitiveFields.forEach(field => {
        if (encryptedObj[field] !== undefined && encryptedObj[field] !== null) {
          encryptedObj[field] = this.encrypt(encryptedObj[field].toString());
        }
      });
      
      return encryptedObj;
    } catch (error) {
      console.error('خطأ في تشفير البيانات الحساسة:', error);
      return obj;
    }
  }

  // فك تشفير البيانات الحساسة في كائن
  decryptSensitiveData(obj, sensitiveFields = []) {
    try {
      if (!obj) return obj;
      
      const decryptedObj = { ...obj };
      
      sensitiveFields.forEach(field => {
        if (decryptedObj[field] !== undefined && decryptedObj[field] !== null) {
          decryptedObj[field] = this.decrypt(decryptedObj[field].toString());
        }
      });
      
      return decryptedObj;
    } catch (error) {
      console.error('خطأ في فك تشفير البيانات الحساسة:', error);
      return obj;
    }
  }

  // تشفير كلمة المرور
  hashPassword(password) {
    try {
      return CryptoJS.SHA256(password + this.secretKey).toString();
    } catch (error) {
      console.error('خطأ في تشفير كلمة المرور:', error);
      return password;
    }
  }

  // التحقق من كلمة المرور
  verifyPassword(password, hashedPassword) {
    try {
      const hashed = this.hashPassword(password);
      return hashed === hashedPassword;
    } catch (error) {
      console.error('خطأ في التحقق من كلمة المرور:', error);
      return false;
    }
  }

  // تشفير ملف
  async encryptFile(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
      const encrypted = CryptoJS.AES.encrypt(wordArray, this.secretKey).toString();
      return encrypted;
    } catch (error) {
      console.error('خطأ في تشفير الملف:', error);
      throw error;
    }
  }

  // فك تشفير ملف
  async decryptFile(encryptedData, mimeType = 'application/octet-stream') {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.secretKey);
      const arrayBuffer = decrypted.toArrayBuffer();
      return new Blob([arrayBuffer], { type: mimeType });
    } catch (error) {
      console.error('خطأ في فك تشفير الملف:', error);
      throw error;
    }
  }

  // إنشاء مفتاح جديد (يجب إعادة تشفير جميع البيانات)
  generateNewKey() {
    const newKey = CryptoJS.lib.WordArray.random(256/8).toString();
    localStorage.setItem('encryption_key', newKey);
    this.secretKey = newKey;
    return newKey;
  }

  // تصدير المفتاح (للاستخدام في بيئة أخرى)
  exportKey() {
    return this.secretKey;
  }

  // استيراد مفتاح
  importKey(key) {
    this.secretKey = key;
    localStorage.setItem('encryption_key', key);
  }

  // حذف المفتاح (حذف جميع البيانات المشفرة)
  deleteKey() {
    localStorage.removeItem('encryption_key');
    this.secretKey = null;
  }

  // التحقق من صحة المفتاح
  validateKey(key) {
    try {
      const testData = 'test';
      const encrypted = CryptoJS.AES.encrypt(testData, key).toString();
      const decrypted = CryptoJS.AES.decrypt(encrypted, key).toString(CryptoJS.enc.Utf8);
      return decrypted === testData;
    } catch (error) {
      return false;
    }
  }
}

// إنشاء مثيل واحد من مدير التشفير
const encryptionManager = new EncryptionManager();

export default encryptionManager;


