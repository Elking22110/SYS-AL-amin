import React, { useState, useEffect } from 'react';
import { ShieldCheck, Key, Laptop, AlertTriangle, CheckCircle, Lock } from 'lucide-react';
import { licenseManager } from '../utils/licenseManager.js';

const LicenseActivationModal = ({ isOpen, onClose, onActivated }) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [licenseStatus, setLicenseStatus] = useState(null);

  useEffect(() => {
    const fp = licenseManager.getMachineFingerprint();
    setFingerprint(fp);

    const check = licenseManager.verifyActivation();
    setLicenseStatus(check);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleActivate = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!licenseKey.trim()) {
      setErrorMsg('يرجى إدخال مفتاح الترخيص');
      return;
    }

    const res = licenseManager.activateLicense(licenseKey, customerName || 'عميل نظام سيس الأمين');
    if (res.success) {
      setSuccessMsg(res.message);
      const updatedCheck = licenseManager.verifyActivation();
      setLicenseStatus(updatedCheck);
      if (onActivated) onActivated(updatedCheck);
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
    } else {
      setErrorMsg(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 bg-opacity-75 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 to-indigo-700 p-6 text-slate-800">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <ShieldCheck className="h-7 w-7 text-slate-800" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">SIS AL AMEEN — تفعيل النظام</h2>
              <p className="text-purple-100 text-xs mt-1">نظام الترخيص والحماية الموثوقة للأجهزة</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Fingerprint Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2 space-x-reverse text-slate-700">
              <Laptop className="h-5 w-5 text-purple-600" />
              <span className="text-xs font-semibold">بصمة الجهاز (Machine Fingerprint):</span>
            </div>
            <code className="text-xs bg-purple-100 text-purple-800 px-2.5 py-1 rounded-md font-mono font-bold">{fingerprint}</code>
          </div>

          {/* Current Status Alert */}
          {licenseStatus && !licenseStatus.isActivated && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs flex items-start space-x-2 space-x-reverse">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold mb-1">حالة التفعيل:</strong>
                <span>{licenseStatus.message}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleActivate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم العميل / المؤسسة:</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                placeholder="أدخل اسم العميل"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">رقم الترخيص (License Key): *</label>
              <div className="relative">
                <Key className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono tracking-wider text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  placeholder="SIS-XXXX-XXXX-XXXX"
                  required
                />
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-center space-x-2 space-x-reverse">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-xs flex items-center space-x-2 space-x-reverse">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="pt-2 flex justify-end space-x-3 space-x-reverse">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  إغلاق
                </button>
              )}
              <button
                type="submit"
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-slate-800 rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-2 space-x-reverse"
              >
                <Lock className="h-4 w-4" />
                <span>تفعيل النظام</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LicenseActivationModal;
