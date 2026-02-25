import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  Trash2, 
  Clock, 
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  HardDrive
} from 'lucide-react';
import backupManager from '../utils/backupManager.js';
import { useNotifications } from './NotificationSystem';
import { formatDate } from '../utils/dateUtils.js';

const BackupManager = () => {
  const { notifySuccess, notifyError } = useNotifications();
  const [backups, setBackups] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    autoBackupEnabled: true,
    backupFrequency: 30,
    maxBackups: 10
  });

  // تحميل البيانات
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [backupsData, statsData] = await Promise.all([
        backupManager.getBackups(),
        backupManager.getStats()
      ]);
      setBackups(backupsData);
      setStats(statsData);
    } catch (error) {
      console.error('خطأ في تحميل البيانات:', error);
      notifyError('خطأ في تحميل البيانات', 'حدث خطأ أثناء تحميل النسخ الاحتياطية');
    } finally {
      setIsLoading(false);
    }
  };

  // إنشاء نسخة احتياطية يدوية
  const createManualBackup = async () => {
    try {
      setIsLoading(true);
      await backupManager.createManualBackup('manual');
      await loadData();
      notifySuccess('تم إنشاء النسخة الاحتياطية', 'تم حفظ النسخة الاحتياطية بنجاح');
    } catch (error) {
      console.error('خطأ في إنشاء النسخة احتياطية:', error);
      notifyError('خطأ في إنشاء النسخة الاحتياطية', 'حدث خطأ أثناء إنشاء النسخة الاحتياطية');
    } finally {
      setIsLoading(false);
    }
  };

  // استعادة نسخة احتياطية
  const restoreBackup = async (backupId) => {
    try {
      const confirmed = window.confirm('هل أنت متأكد من استعادة هذه النسخة الاحتياطية؟ سيتم استبدال جميع البيانات الحالية.');
      if (!confirmed) return;

      setIsLoading(true);
      await backupManager.restoreBackup(backupId);
      notifySuccess('تم استعادة النسخة الاحتياطية', 'تم استعادة البيانات بنجاح');
    } catch (error) {
      console.error('خطأ في استعادة النسخة احتياطية:', error);
      notifyError('خطأ في استعادة النسخة الاحتياطية', 'حدث خطأ أثناء استعادة النسخة الاحتياطية');
    } finally {
      setIsLoading(false);
    }
  };

  // تصدير نسخة احتياطية
  const exportBackup = async (backupId) => {
    try {
      await backupManager.exportBackup(backupId);
      notifySuccess('تم تصدير النسخة الاحتياطية', 'تم تحميل ملف النسخة الاحتياطية');
    } catch (error) {
      console.error('خطأ في تصدير النسخة الاحتياطية:', error);
      notifyError('خطأ في تصدير النسخة الاحتياطية', 'حدث خطأ أثناء تصدير النسخة الاحتياطية');
    }
  };

  // استيراد نسخة احتياطية
  const importBackup = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;

      await backupManager.importBackup(file);
      await loadData();
      notifySuccess('تم استيراد النسخة الاحتياطية', 'تم استيراد البيانات بنجاح');
    } catch (error) {
      console.error('خطأ في استيراد النسخة احتياطية:', error);
      notifyError('خطأ في استيراد النسخة الاحتياطية', 'حدث خطأ أثناء استيراد النسخة الاحتياطية');
    }
  };

  // حذف نسخة احتياطية
  const deleteBackup = async (backupId) => {
    try {
      const confirmed = window.confirm('هل أنت متأكد من حذف هذه النسخة الاحتياطية؟');
      if (!confirmed) return;

      await backupManager.deleteBackup(backupId);
      await loadData();
      notifySuccess('تم حذف النسخة الاحتياطية', 'تم حذف النسخة الاحتياطية بنجاح');
    } catch (error) {
      console.error('خطأ في حذف النسخة الاحتياطية:', error);
      notifyError('خطأ في حذف النسخة الاحتياطية', 'حدث خطأ أثناء حذف النسخة الاحتياطية');
    }
  };

  // تحديث الإعدادات
  const updateSettings = async () => {
    try {
      await backupManager.updateSettings(settings);
      setShowSettings(false);
      await loadData();
      notifySuccess('تم تحديث الإعدادات', 'تم حفظ إعدادات النسخ الاحتياطية');
    } catch (error) {
      console.error('خطأ في تحديث الإعدادات:', error);
      notifyError('خطأ في تحديث الإعدادات', 'حدث خطأ أثناء تحديث الإعدادات');
    }
  };


  // تنسيق الحجم
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 بايت';
    const k = 1024;
    const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* العنوان والإحصائيات */}
      <div className="glass-card hover-lift animate-fadeInUp">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg">
              <Database className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">إدارة النسخ الاحتياطية</h2>
              <p className="text-gray-300">إدارة وحماية بيانات النظام</p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 bg-white bg-opacity-10 rounded-lg hover:bg-opacity-20 transition-colors"
            title="إعدادات النسخ الاحتياطية"
          >
            <Settings className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* الإحصائيات */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <HardDrive className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-sm text-gray-300">إجمالي النسخ</p>
                  <p className="text-lg font-bold text-white">{stats.totalBackups}</p>
                </div>
              </div>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-green-400" />
                <div>
                  <p className="text-sm text-gray-300">الحجم الإجمالي</p>
                  <p className="text-lg font-bold text-white">{formatSize(stats.totalSize)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-orange-400" />
                <div>
                  <p className="text-sm text-gray-300">آخر نسخة</p>
                  <p className="text-sm font-medium text-white">
                    {stats.lastBackup ? formatDate(stats.lastBackup) : 'لا توجد'}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <RefreshCw className="h-5 w-5 text-purple-400" />
                <div>
                  <p className="text-sm text-gray-300">النسخ التلقائية</p>
                  <p className="text-sm font-medium text-white">
                    {stats.autoBackupEnabled ? 'مفعلة' : 'معطلة'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* إعدادات النسخ الاحتياطية */}
      {showSettings && (
        <div className="glass-card hover-lift animate-fadeInUp">
          <h3 className="text-lg font-bold text-white mb-4">إعدادات النسخ الاحتياطية</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-white">النسخ التلقائية</label>
              <button
                onClick={() => setSettings({...settings, autoBackupEnabled: !settings.autoBackupEnabled})}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.autoBackupEnabled ? 'bg-green-500' : 'bg-gray-500'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.autoBackupEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}></div>
              </button>
            </div>
            <div>
              <label className="block text-white mb-2">تكرار النسخ (دقيقة)</label>
              <input
                type="number"
                value={settings.backupFrequency}
                onChange={(e) => setSettings({...settings, backupFrequency: parseInt(e.target.value)})}
                className="w-full px-3 py-2 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white"
                min="5"
                max="1440"
              />
            </div>
            <div>
              <label className="block text-white mb-2">أقصى عدد نسخ</label>
              <input
                type="number"
                value={settings.maxBackups}
                onChange={(e) => setSettings({...settings, maxBackups: parseInt(e.target.value)})}
                className="w-full px-3 py-2 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white"
                min="1"
                max="50"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={updateSettings}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                حفظ الإعدادات
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* أزرار الإجراءات */}
      <div className="glass-card hover-lift animate-fadeInUp">
        <div className="flex flex-wrap gap-4">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              createManualBackup();
            }}
            disabled={isLoading}
            className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors min-h-[50px] cursor-pointer"
            style={{ 
              pointerEvents: 'auto',
              zIndex: 10,
              position: 'relative'
            }}
          >
            <Database className="h-5 w-5" />
            <span className="font-semibold">إنشاء نسخة احتياطية</span>
          </button>
          <label 
            className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer min-h-[50px]"
            style={{ 
              pointerEvents: 'auto',
              zIndex: 10,
              position: 'relative'
            }}
          >
            <Upload className="h-5 w-5" />
            <span className="font-semibold">استيراد نسخة احتياطية</span>
            <input
              type="file"
              accept=".json"
              onChange={importBackup}
              className="hidden"
            />
          </label>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              loadData();
            }}
            disabled={isLoading}
            className="flex items-center space-x-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-colors min-h-[50px] cursor-pointer"
            style={{ 
              pointerEvents: 'auto',
              zIndex: 10,
              position: 'relative'
            }}
          >
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="font-semibold">تحديث</span>
          </button>
        </div>
      </div>

      {/* قائمة النسخ الاحتياطية */}
      <div className="glass-card hover-lift animate-fadeInUp">
        <h3 className="text-lg font-bold text-white mb-4">النسخ الاحتياطية</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 text-white animate-spin" />
            <span className="mr-3 text-white">جاري التحميل...</span>
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Database className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>لا توجد نسخ احتياطية</p>
          </div>
        ) : (
          <div className="space-y-3">
            {backups.map((backup) => (
              <div key={backup.id} className="bg-white bg-opacity-10 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="p-2 bg-blue-500 bg-opacity-20 rounded-lg">
                        <Database className="h-4 w-4 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">
                          {backup.type === 'auto' ? 'نسخة تلقائية' : 
                           backup.type === 'manual' ? 'نسخة يدوية' : 
                           backup.type === 'imported' ? 'نسخة مستوردة' : 'نسخة احتياطية'}
                        </h4>
                        <p className="text-sm text-gray-300">{formatDate(backup.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span>الحجم: {formatSize(backup.encryptedData ? backup.encryptedData.length : 0)}</span>
                      <span>مشفرة: {backup.encrypted ? 'نعم' : 'لا'}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        exportBackup(backup.id);
                      }}
                      className="p-3 text-blue-400 hover:text-blue-300 hover:bg-blue-500 hover:bg-opacity-20 rounded-lg transition-colors min-h-[40px] min-w-[40px] cursor-pointer"
                      style={{ 
                        pointerEvents: 'auto',
                        zIndex: 10,
                        position: 'relative'
                      }}
                      title="تصدير"
                    >
                      <Download className="h-5 w-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        restoreBackup(backup.id);
                      }}
                      className="p-3 text-green-400 hover:text-green-300 hover:bg-green-500 hover:bg-opacity-20 rounded-lg transition-colors min-h-[40px] min-w-[40px] cursor-pointer"
                      style={{ 
                        pointerEvents: 'auto',
                        zIndex: 10,
                        position: 'relative'
                      }}
                      title="استعادة"
                    >
                      <RefreshCw className="h-5 w-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteBackup(backup.id);
                      }}
                      className="p-3 text-red-400 hover:text-red-300 hover:bg-red-500 hover:bg-opacity-20 rounded-lg transition-colors min-h-[40px] min-w-[40px] cursor-pointer"
                      style={{ 
                        pointerEvents: 'auto',
                        zIndex: 10,
                        position: 'relative'
                      }}
                      title="حذف"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BackupManager;


