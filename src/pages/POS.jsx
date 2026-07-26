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
    // التحديث لحظياً عند بدء/إنهاء الوردية أو تزامنها سحابياً
    const checkShift = () => {
      storageOptimizer.clearCache('activeShift');
      const shift = storageOptimizer.get('activeShift', null);
      setActiveShift(shift && shift.status === 'active' ? shift : null);
    };
    const onEnded = () => {
      setActiveShift(null);
    };
    const handleShiftSync = (e) => {
      const target = e?.detail?.table || e?.detail?.type || e?.key;
      if (!target || target === 'shifts' || target === 'active_shift' || target === 'activeShift') {
        checkShift();
      }
    };

    window.addEventListener('shiftStarted', checkShift);
    window.addEventListener('shiftEnded', onEnded);
    window.addEventListener('realtimeDataUpdate', handleShiftSync);
    window.addEventListener('dataUpdated', handleShiftSync);
    window.addEventListener('databaseSyncTrigger', handleShiftSync);
    window.addEventListener('storage', handleShiftSync);

    return () => {
      window.removeEventListener('shiftStarted', checkShift);
      window.removeEventListener('shiftEnded', onEnded);
      window.removeEventListener('realtimeDataUpdate', handleShiftSync);
      window.removeEventListener('dataUpdated', handleShiftSync);
      window.removeEventListener('databaseSyncTrigger', handleShiftSync);
      window.removeEventListener('storage', handleShiftSync);
    };
  }, []);

  if (!activeShift) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="glass-card p-8 text-center max-w-md border border-slate-200">
          <h1 className="text-2xl font-bold text-slate-800 mb-3">نقطة البيع غير مفعّلة</h1>
          <p className="text-slate-600 mb-4">الرجاء بدء وردية نشطة لتفعيل نقطة البيع.</p>
          <p className="text-xs text-slate-500">انتقل إلى قسم الوردية لبدء وردية جديدة.</p>
        </div>
      </div>
    );
  }

  return <POSMain />;
};

export default POS;