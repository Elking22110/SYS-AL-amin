import React, { useEffect, useState } from 'react';
import POSMain from '../components/POS/POSMain';
import storageOptimizer from '../utils/storageOptimizer.js';

const POS = () => {
  const [activeShift, setActiveShift] = useState(null);

  useEffect(() => {
    try {
      const shift = storageOptimizer.get('activeShift', null);
      setActiveShift(shift && shift.status === 'active' ? shift : null);
    } catch (_) {
      setActiveShift(null);
    }
    // التحديث لحظياً عند بدء/إنهاء الوردية
    const onStarted = (e) => {
      const shift = storageOptimizer.get('activeShift', null);
      setActiveShift(shift && shift.status === 'active' ? shift : null);
    };
    const onEnded = (e) => {
      setActiveShift(null);
    };
    window.addEventListener('shiftStarted', onStarted);
    window.addEventListener('shiftEnded', onEnded);
    return () => {
      window.removeEventListener('shiftStarted', onStarted);
      window.removeEventListener('shiftEnded', onEnded);
    };
  }, []);

  if (!activeShift) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <div className="glass-card p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-white mb-3">نقطة البيع غير مفعّلة</h1>
          <p className="text-purple-200 mb-4">الرجاء بدء وردية نشطة لتفعيل نقطة البيع.</p>
          <p className="text-xs text-purple-300">انتقل إلى قسم الوردية لبدء وردية جديدة.</p>
        </div>
      </div>
    );
  }

  return <POSMain />;
};

export default POS;