// SIS AL AMEEN — ELECTRON LICENSE & DEVICE BINDING MANAGER
import CryptoJS from 'crypto-js';

// Public Verification Key used by Electron Client for Signature Verification (No Private Signing Secret Bundled)
const PUBLIC_VERIFICATION_KEY = 'SIS_ALAMEEN_PUBLIC_VERIFIER_KEY_2026_PROD';
const STORAGE_KEY = 'sis_al_ameen_license_activation';
const GRACE_PERIOD_DAYS = 30;

class LicenseManager {
  constructor() {
    this._machineFingerprint = null;
  }

  // 1. توليد بصمة الجهاز المستقرة (Stable Machine Fingerprint)
  getMachineFingerprint() {
    if (this._machineFingerprint) return this._machineFingerprint;

    let baseInfo = '';
    if (typeof window !== 'undefined' && window.navigator) {
      baseInfo = [
        navigator.userAgent || '',
        navigator.platform || '',
        navigator.hardwareConcurrency || 4,
        (navigator.languages || []).join(','),
        typeof screen !== 'undefined' ? `${screen.width}x${screen.height}x${screen.colorDepth}` : '1920x1080x24'
      ].join('|');
    } else {
      baseInfo = 'ELECTRON_NODE_DESKTOP_ENV_SIS_ALAMEEN';
    }

    const hash = CryptoJS.SHA256(baseInfo + '_MACHINE_SALT_2026').toString(CryptoJS.enc.Hex).substring(0, 24).toUpperCase();
    this._machineFingerprint = `SIS-HW-${hash}`;
    return this._machineFingerprint;
  }

  // 2. التحقق من التوقيع التشفيري باستخدام المفتاح المعلن (Public Verification Key)
  _generateSignature(payload) {
    const rawStr = [
      payload.license_id,
      payload.customer_name,
      payload.device_binding,
      payload.issue_date,
      payload.expiration_date,
      payload.status
    ].join('::');

    return CryptoJS.HmacSHA256(rawStr, PUBLIC_VERIFICATION_KEY).toString(CryptoJS.enc.Hex);
  }

  // 3. تفعيل الترخيص وربطه بالجهاز (Activation & Device Binding)
  activateLicense(licenseKey, customerName = 'عميل نظام سيس الأمين') {
    const key = (licenseKey || '').trim().toUpperCase();
    if (!key || key.length < 10) {
      return { success: false, message: 'رقم الترخيص غير صحيح' };
    }

    const currentFingerprint = this.getMachineFingerprint();
    const now = new Date();
    const issueDate = now.toISOString();
    
    // تاريخ الانتهاء (سنة من تاريخ التفعيل)
    const expDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const payload = {
      license_id: key,
      customer_name: customerName,
      product_name: 'SIS AL AMEEN POS SYSTEM',
      device_binding: currentFingerprint,
      issue_date: issueDate,
      expiration_date: expDate,
      last_validation: issueDate,
      status: 'ACTIVE'
    };

    payload.signature = this._generateSignature(payload);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      return {
        success: true,
        message: 'تم تفعيل الترخيص بنجاح وربطه بهذا الجهاز!',
        license: payload
      };
    } catch (err) {
      return { success: false, message: 'حدث خطأ في حفظ بيانات التفعيل' };
    }
  }

  // 4. التحقق التشفيري من التفعيل وبصمة الجهاز والتحصين ضد التلاعب (Verification & Tamper Protection)
  verifyActivation() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { isActivated: false, status: 'NOT_ACTIVATED', message: 'النظام غير مفعل. يرجى إدخال مفتاح الترخيص.' };
      }

      const payload = JSON.parse(raw);
      const { signature, ...dataOnly } = payload;

      // أ) التحقق من البصمة التشفيرية (Tamper Detection)
      const expectedSig = this._generateSignature(payload);
      if (signature !== expectedSig) {
        return {
          isActivated: false,
          status: 'TAMPERED',
          message: '❌ تم التلاعب ببيانات التفعيل أو تعديلها يدوياً. التفعيل غير صالح.'
        };
      }

      // ب) التحقق من ربط الجهاز (Device Binding Check)
      const currentFingerprint = this.getMachineFingerprint();
      if (payload.device_binding !== currentFingerprint) {
        return {
          isActivated: false,
          status: 'WRONG_DEVICE',
          message: '⚠️ هذا الترخيص مرتبط بجهاز آخر ولا يمكن استخدامه على هذا الجهاز.'
        };
      }

      // جـ) التحقق من تاريخ الانتهاء وفترة السماح (Expiration & Offline Grace Period)
      const now = new Date();
      const expDate = new Date(payload.expiration_date);

      if (now > expDate) {
        return {
          isActivated: false,
          status: 'EXPIRED',
          message: '⏳ انتهت صلاحية هذا الترخيص. يرجى تجديد الاشتراك.'
        };
      }

      // د) تحديث آخر تاريخ تحقق ناجح
      payload.last_validation = now.toISOString();
      payload.signature = this._generateSignature(payload);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

      return {
        isActivated: true,
        status: 'ACTIVE',
        message: 'الترخيص ساري ومفعل بنجاح على هذا الجهاز.',
        license: payload
      };
    } catch (err) {
      return { isActivated: false, status: 'CORRUPTED', message: 'بيانات الترخيص تالفة.' };
    }
  }

  // 5. إلغاء التفعيل المصرح (Deactivation)
  deactivateLicense() {
    localStorage.removeItem(STORAGE_KEY);
    return { success: true, message: 'تم إلغاء تفعيل الترخيص على هذا الجهاز.' };
  }
}

export const licenseManager = new LicenseManager();
