import React, { useState, useEffect } from 'react';
import { DataValidator } from '../utils/dataValidation';

const DataLoader = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('جاري تحميل البيانات...');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingMessage('جاري التحقق من البيانات...');
        
        // التحقق من صحة البيانات
        const validation = DataValidator.validateStoredData();
        if (!validation.isValid) {
          setLoadingMessage('جاري إصلاح البيانات...');
          await new Promise(resolve => setTimeout(resolve, 1000)); // محاكاة وقت الإصلاح
          
          const repaired = DataValidator.repairData();
          if (!repaired) {
            setLoadingMessage('خطأ في إصلاح البيانات');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        setLoadingMessage('جاري تحميل البيانات...');
        await new Promise(resolve => setTimeout(resolve, 500)); // محاكاة وقت التحميل
        
        setIsLoading(false);
      } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
        setLoadingMessage('خطأ في تحميل البيانات');
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-white mb-2">نظام إدارة المبيعات</h2>
          <p className="text-blue-300">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  return children;
};

export default DataLoader;




