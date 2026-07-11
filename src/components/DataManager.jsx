import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthProvider';
import databaseManager from '../utils/database';
import { design } from '../utils/design';
import { perf } from '../utils/performance';
import { formatDate, getCurrentDate } from '../utils/dateUtils.js';
import syncManager from '../utils/syncManager';
import { 
  Download, 
  Upload, 
  Database, 
  Shield, 
  RefreshCw, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  AlertTriangle,
  FileText,
  HardDrive,
  Cloud,
  CloudOff,
  CloudLightning,
  Wifi,
  WifiOff,
  Settings,
  BarChart3,
  Users,
  Package,
  ShoppingCart,
  Loader
} from 'lucide-react';
import { publish, EVENTS } from '../utils/observerManager';

const DataManager = () => {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('backup');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [stats, setStats] = useState(null);
  const [backups, setBackups] = useState([]);

  // ---- حالة المزامنة السحابية ----
  const [syncStatus, setSyncStatus] = useState(syncManager.status);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState({ type: '', text: '' });
  const [tableSyncStats, setTableSyncStats] = useState({});

  // الاشتراك في تحديثات حالة المزامنة
  useEffect(() => {
    const unsubscribe = syncManager.subscribe((status) => {
      setSyncStatus(status);
      if (status === 'syncing') setSyncLoading(true);
      else setSyncLoading(false);
    });
    return unsubscribe;
  }, []);

  // تحميل إحصائيات كل جدول (pending / synced / deleted)
  const loadTableSyncStats = useCallback(async () => {
    const stores = ['products', 'categories', 'customers', 'sales', 'shifts', 'returns'];
    const result = {};
    for (const store of stores) {
      try {
        const all = await databaseManager.getAllForSync(store);
        result[store] = {
          total: all.length,
          pending: all.filter(r => r && r.sync_status === 'pending').length,
          synced: all.filter(r => r && r.sync_status === 'synced').length,
          deleted: all.filter(r => r && r.sync_status === 'deleted').length,
          noStatus: all.filter(r => r && !r.sync_status).length,
        };
      } catch {
        result[store] = { total: 0, pending: 0, synced: 0, deleted: 0, noStatus: 0 };
      }
    }
    setTableSyncStats(result);
  }, []);

  // مزامنة يدوية فورية
  const handleManualSync = async () => {
    setSyncLoading(true);
    setSyncMessage({ type: '', text: '' });
    try {
      await syncManager.triggerSync();
      setSyncMessage({ type: 'success', text: '✅ تمت المزامنة مع السحابة بنجاح!' });
      await loadTableSyncStats();
    } catch (err) {
      setSyncMessage({ type: 'error', text: `❌ فشلت المزامنة: ${err?.message || 'خطأ غير معروف'}` });
    } finally {
      setSyncLoading(false);
    }
  };

  // إعادة ضبط كل السجلات بدون sync_status إلى pending (لضمان رفعها)
  const handleMarkAllPending = async () => {
    if (!confirm('سيتم تحديد جميع السجلات للمزامنة مع السحابة. هل تريد المتابعة؟')) return;
    setSyncLoading(true);
    setSyncMessage({ type: '', text: '' });
    let totalMarked = 0;
    const stores = ['products', 'categories', 'customers', 'sales', 'shifts', 'returns'];
    for (const store of stores) {
      try {
        const all = await databaseManager.getAllForSync(store);
        for (const record of all) {
          if (record && record.sync_status !== 'pending' && record.sync_status !== 'deleted') {
            record.sync_status = 'pending';
            record.updated_at = record.updated_at || new Date().toISOString();
            const tx = databaseManager.db.transaction([store], 'readwrite');
            tx.objectStore(store).put(record);
            totalMarked++;
          }
        }
      } catch (e) {
        console.error(`خطأ في تعليم ${store}:`, e);
      }
    }
    setSyncMessage({ type: 'success', text: `✅ تم تعليم ${totalMarked} سجل للمزامنة. ابدأ المزامنة الآن.` });
    await loadTableSyncStats();
    setSyncLoading(false);
  };

  // دالة تحويل البيانات إلى CSV
  const convertToCSV = (data) => {
    let csv = '';
    
    for (const [tableName, records] of Object.entries(data)) {
      if (records && records.length > 0) {
        csv += `\n=== ${tableName.toUpperCase()} ===\n`;
        
        // الحصول على العناوين من أول سجل
        const headers = Object.keys(records[0]);
        csv += headers.join(',') + '\n';
        
        // إضافة البيانات
        records.forEach(record => {
          const values = headers.map(header => {
            const value = record[header];
            // تنظيف القيم للـ CSV
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value || '';
          });
          csv += values.join(',') + '\n';
        });
      }
    }
    
    return csv;
  };

  useEffect(() => {
    loadStats();
    loadBackups();
  }, []);

  const loadStats = async () => {
    try {
      const databaseStats = await databaseManager.getStats();
      const performanceStats = perf.stats();
      const designStats = design.stats();
      
      setStats({
        database: databaseStats,
        performance: performanceStats,
        design: designStats
      });
    } catch (error) {
      console.error('خطأ في تحميل الإحصائيات:', error);
    }
  };

  const loadBackups = async () => {
    try {
      const backups = await databaseManager.getBackups();
      setBackups(backups.map((backup, index) => ({
        id: backup.id,
        index,
        timestamp: backup.date,
        size: JSON.stringify(backup.data).length,
        type: backup.type
      })));
    } catch (error) {
      console.error('خطأ في تحميل النسخ الاحتياطية:', error);
      setBackups([]);
    }
  };

  const handleExport = async (format = 'json') => {
    if (!hasPermission('read')) {
      setMessage({ type: 'error', text: 'ليس لديك صلاحية التصدير' });
      return;
    }

    setLoading(true);
    try {
      const data = await databaseManager.exportData();
      const dataString = format === 'json' ? JSON.stringify(data, null, 2) : convertToCSV(data);
      
      if (format === 'json') {
        const blob = new Blob([dataString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pos_system_backup_${getCurrentDate().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        const blob = new Blob([dataString], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pos_system_backup_${getCurrentDate().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      setMessage({ type: 'success', text: 'تم تصدير البيانات بنجاح' });
    } catch (error) {
      setMessage({ type: 'error', text: 'فشل في تصدير البيانات' });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (event) => {
    if (!hasPermission('write')) {
      setMessage({ type: 'error', text: 'ليس لديك صلاحية الاستيراد' });
      return;
    }

    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      if (/\.json$/i.test(file.name)) {
        const text = await file.text();
        const data = JSON.parse(text);
        await databaseManager.importData(data);
        setMessage({ type: 'success', text: 'تم استيراد البيانات بنجاح' });
        try { publish(EVENTS.DATA_IMPORTED, ['products','categories','customers','sales','users','settings']); } catch(_) {}
        loadStats();
        return;
      }

      setMessage({ type: 'error', text: 'صيغة الملف غير مدعومة. استخدم JSON فقط' });
    } catch (error) {
      console.error('Import error:', error);
      setMessage({ type: 'error', text: 'فشل في استيراد البيانات' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportSettings = async () => {
    if (!hasPermission('read')) {
      setMessage({ type: 'error', text: 'ليس لديك صلاحية التصدير' });
      return;
    }

    setLoading(true);
    try {
      const settingsData = await databaseManager.exportSettings();
      const dataString = JSON.stringify(settingsData, null, 2);
      
      const blob = new Blob([dataString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pos_system_settings_${getCurrentDate().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'تم تصدير الإعدادات بنجاح' });
    } catch (error) {
      setMessage({ type: 'error', text: 'فشل في تصدير الإعدادات' });
    } finally {
      setLoading(false);
    }
  };

  const handleImportSettings = async (event) => {
    if (!hasPermission('write')) {
      setMessage({ type: 'error', text: 'ليس لديك صلاحية الاستيراد' });
      return;
    }

    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const text = await file.text();
      const settingsData = JSON.parse(text);
      
      await databaseManager.importSettings(settingsData);
      setMessage({ type: 'success', text: 'تم استيراد الإعدادات بنجاح' });
      try { publish(EVENTS.DATA_IMPORTED, ['settings']); } catch(_) {}
      loadStats();
    } catch (error) {
      setMessage({ type: 'error', text: 'فشل في استيراد الإعدادات' });
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    if (!hasPermission('write')) {
      setMessage({ type: 'error', text: 'ليس لديك صلاحية إنشاء نسخة احتياطية' });
      return;
    }

    setLoading(true);
    try {
      const backup = await databaseManager.createBackup('full');
      if (backup) {
        setMessage({ type: 'success', text: 'تم إنشاء نسخة احتياطية بنجاح' });
        loadBackups();
        loadStats();
        try { publish(EVENTS.DATA_BACKED_UP, { id: backup.id }); } catch(_) {}
      } else {
        setMessage({ type: 'error', text: 'فشل في إنشاء النسخة الاحتياطية' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'فشل في إنشاء النسخة الاحتياطية' });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (backupId) => {
    if (!hasPermission('write')) {
      setMessage({ type: 'error', text: 'ليس لديك صلاحية استعادة النسخة الاحتياطية' });
      return;
    }

    if (!confirm('هل أنت متأكد من استعادة هذه النسخة الاحتياطية؟ سيتم استبدال جميع البيانات الحالية.')) {
      return;
    }

    setLoading(true);
    try {
      const success = await databaseManager.restoreBackup(backupId);
      if (success) {
        setMessage({ type: 'success', text: 'تم استعادة النسخة الاحتياطية بنجاح' });
        loadStats();
        loadBackups();
      } else {
        setMessage({ type: 'error', text: 'فشل في استعادة النسخة الاحتياطية' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'فشل في استعادة النسخة الاحتياطية' });
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (!hasPermission('write')) {
      setMessage({ type: 'error', text: 'ليس لديك صلاحية تنظيف البيانات' });
      return;
    }

    if (!confirm('هل أنت متأكد من تنظيف البيانات؟ سيتم حذف جميع البيانات نهائياً.')) {
      return;
    }

    setLoading(true);
    try {
      await databaseManager.cleanup();
      setMessage({ type: 'success', text: 'تم تنظيف البيانات بنجاح' });
      loadStats();
      loadBackups();
    } catch (error) {
      setMessage({ type: 'error', text: 'فشل في تنظيف البيانات' });
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };


  return (
    <div className="glass-card hover-lift animate-fadeInUp p-6">
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mr-4">
          <Database className="h-6 w-6 text-slate-800" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">إدارة البيانات</h2>
          <p className="text-purple-200 text-sm">نسخ احتياطي، استيراد، تصدير، وإحصائيات</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveTab('backup');
          }}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors min-h-[50px] cursor-pointer ${
            activeTab === 'backup' 
              ? 'bg-purple-500 bg-opacity-20 text-purple-300 border border-purple-500 border-opacity-30' 
              : 'text-slate-800 hover:bg-white hover:bg-opacity-10'
          }`}
          style={{ 
            pointerEvents: 'auto',
            zIndex: 10,
            position: 'relative'
          }}
        >
          <HardDrive className="h-5 w-5 inline mr-2" />
          النسخ الاحتياطية
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveTab('import');
          }}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors min-h-[50px] cursor-pointer ${
            activeTab === 'import' 
              ? 'bg-purple-500 bg-opacity-20 text-purple-300 border border-purple-500 border-opacity-30' 
              : 'text-slate-800 hover:bg-white hover:bg-opacity-10'
          }`}
          style={{ 
            pointerEvents: 'auto',
            zIndex: 10,
            position: 'relative'
          }}
        >
          <Upload className="h-5 w-5 inline mr-2" />
          الاستيراد/التصدير
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveTab('stats');
          }}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors min-h-[50px] cursor-pointer ${
            activeTab === 'stats' 
              ? 'bg-purple-500 bg-opacity-20 text-purple-300 border border-purple-500 border-opacity-30' 
              : 'text-slate-800 hover:bg-white hover:bg-opacity-10'
          }`}
          style={{ 
            pointerEvents: 'auto',
            zIndex: 10,
            position: 'relative'
          }}
        >
          <BarChart3 className="h-5 w-5 inline mr-2" />
          الإحصائيات
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveTab('cleanup');
          }}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors min-h-[50px] cursor-pointer ${
            activeTab === 'cleanup' 
              ? 'bg-purple-500 bg-opacity-20 text-purple-300 border border-purple-500 border-opacity-30' 
              : 'text-slate-800 hover:bg-white hover:bg-opacity-10'
          }`}
          style={{ 
            pointerEvents: 'auto',
            zIndex: 10,
            position: 'relative'
          }}
        >
          <Trash2 className="h-5 w-5 inline mr-2" />
          التنظيف
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveTab('cloudsync');
            loadTableSyncStats();
          }}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors min-h-[50px] cursor-pointer ${
            activeTab === 'cloudsync' 
              ? 'bg-blue-500 bg-opacity-20 text-blue-300 border border-blue-500 border-opacity-30' 
              : 'text-slate-800 hover:bg-white hover:bg-opacity-10'
          }`}
          style={{ 
            pointerEvents: 'auto',
            zIndex: 10,
            position: 'relative'
          }}
        >
          <Cloud className="h-5 w-5 inline mr-2" />
          مزامنة السحابة
        </button>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-500 bg-opacity-20 border border-green-500 border-opacity-30' 
            : 'bg-red-500 bg-opacity-20 border border-red-500 border-opacity-30'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-300 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-300 mr-2" />
            )}
            <span className={`text-sm ${
              message.type === 'success' ? 'text-green-300' : 'text-red-300'
            }`}>
              {message.text}
            </span>
          </div>
        </div>
      )}

      {/* Backup Tab */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800">النسخ الاحتياطية</h3>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleBackup();
              }}
              disabled={loading}
              className="btn-primary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center min-h-[50px] cursor-pointer"
              style={{ 
                pointerEvents: 'auto',
                zIndex: 10,
                position: 'relative'
              }}
            >
              <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
              <span className="font-semibold">إنشاء نسخة احتياطية</span>
            </button>
          </div>

          <div className="space-y-3">
            {backups.length === 0 ? (
              <div className="text-center py-8 text-purple-200">
                <HardDrive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد نسخ احتياطية</p>
              </div>
            ) : (
              backups.map((backup, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-white bg-opacity-10 rounded-lg">
                  <div className="flex items-center">
                    <Database className="h-5 w-5 text-purple-300 mr-3" />
                    <div>
                      <div className="text-slate-800 font-medium">نسخة احتياطية #{backup.index + 1}</div>
                      <div className="text-purple-200 text-sm">
                        {formatDate(backup.timestamp)} • {formatBytes(backup.size)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRestore(backup.id);
                    }}
                    disabled={loading}
                    className="bg-green-500 bg-opacity-20 text-green-300 px-4 py-2 rounded-lg hover:bg-opacity-30 transition-colors disabled:opacity-50 min-h-[40px] cursor-pointer"
                    style={{ 
                      pointerEvents: 'auto',
                      zIndex: 10,
                      position: 'relative'
                    }}
                  >
                    <span className="font-semibold">استعادة</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Import/Export Tab */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">التصدير</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleExport('json');
                }}
                disabled={loading}
                className="btn-primary p-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-h-[60px] cursor-pointer"
                style={{ 
                  pointerEvents: 'auto',
                  zIndex: 10,
                  position: 'relative'
                }}
              >
                <Download className="h-6 w-6 mr-3" />
                <span className="font-semibold text-lg">تصدير JSON</span>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleExport('csv');
                }}
                disabled={loading}
                className="btn-primary p-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-h-[60px] cursor-pointer"
                style={{ 
                  pointerEvents: 'auto',
                  zIndex: 10,
                  position: 'relative'
                }}
              >
                <FileText className="h-6 w-6 mr-3" />
                <span className="font-semibold text-lg">تصدير CSV</span>
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">الاستيراد</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  disabled={loading}
                  className="hidden"
                  id="import-file"
                />
                <label
                  htmlFor="import-file"
                  className="btn-primary p-6 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-h-[60px]"
                  style={{ 
                    pointerEvents: 'auto',
                    zIndex: 10,
                    position: 'relative'
                  }}
                >
                  <Upload className="h-6 w-6 mr-3" />
                  <span className="font-semibold text-lg">استيراد ملف JSON</span>
                </label>
              </div>
              
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportSettings}
                  disabled={loading}
                  className="hidden"
                  id="import-settings-file"
                />
                <label
                  htmlFor="import-settings-file"
                  className="btn-secondary p-6 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-h-[60px]"
                  style={{ 
                    pointerEvents: 'auto',
                    zIndex: 10,
                    position: 'relative'
                  }}
                >
                  <Settings className="h-6 w-6 mr-3" />
                  <span className="font-semibold text-lg">استيراد الإعدادات فقط</span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">تصدير الإعدادات</h3>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleExportSettings();
                }}
                disabled={loading}
                className="btn-secondary p-6 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-h-[60px] w-full"
                style={{ 
                  pointerEvents: 'auto',
                  zIndex: 10,
                  position: 'relative'
                }}
              >
                <Settings className="h-6 w-6 mr-3" />
                <span className="font-semibold text-lg">تصدير الإعدادات فقط</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-slate-800">إحصائيات النظام</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Database Stats */}
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <Database className="h-5 w-5 text-blue-300 mr-2" />
                <h4 className="text-slate-800 font-semibold">قاعدة البيانات</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-purple-200">إجمالي السجلات:</span>
                  <span className="text-slate-800">{Object.values(stats.database).reduce((sum, count) => sum + count, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-200">المنتجات:</span>
                  <span className="text-slate-800">{stats.database.products || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-200">العملاء:</span>
                  <span className="text-slate-800">{stats.database.customers || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-200">المبيعات:</span>
                  <span className="text-slate-800">{stats.database.sales || 0}</span>
                </div>
              </div>
            </div>

            {/* Performance Stats */}
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <BarChart3 className="h-5 w-5 text-green-300 mr-2" />
                <h4 className="text-slate-800 font-semibold">الأداء</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-purple-200">الكاش:</span>
                  <span className="text-slate-800">{stats.performance.cache.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-200">كاش الصور:</span>
                  <span className="text-slate-800">{stats.performance.cache.imageCache}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-200">المؤقتات:</span>
                  <span className="text-slate-800">{stats.performance.timers.debounce + stats.performance.timers.throttle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-200">الذاكرة:</span>
                  <span className="text-slate-800">
                    {stats.performance.performance.memory ? 
                      formatBytes(stats.performance.performance.memory.used) : 'غير متاح'}
                  </span>
                </div>
              </div>
            </div>

            {/* Design Stats */}
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <Settings className="h-5 w-5 text-purple-300 mr-2" />
                <h4 className="text-slate-800 font-semibold">التصميم</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-purple-200">الثيم الحالي:</span>
                  <span className="text-slate-800">{stats.design.currentTheme}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-200">الثيمات المتاحة:</span>
                  <span className="text-slate-800">{stats.design.availableThemes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-200">الأنيميشن:</span>
                  <span className="text-slate-800">{stats.design.animations.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-200">الألوان:</span>
                  <span className="text-slate-800">{Object.keys(stats.design.colorPalette).length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cleanup Tab */}
      {activeTab === 'cleanup' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-slate-800">تنظيف البيانات</h3>
          
          <div className="bg-yellow-500 bg-opacity-20 border border-yellow-500 border-opacity-30 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <AlertCircle className="h-5 w-5 text-yellow-300 mr-2" />
              <span className="text-yellow-300 font-semibold">تحذير</span>
            </div>
            <p className="text-yellow-200 text-sm">
              تنظيف البيانات سيحذف الكاش القديم والبيانات المؤقتة. هذا لا يؤثر على البيانات الأساسية.
            </p>
          </div>

          <button
            onClick={handleCleanup}
            disabled={loading}
            className="bg-red-500 bg-opacity-20 text-red-300 px-6 py-3 rounded-lg hover:bg-opacity-30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Trash2 className="h-5 w-5 mr-2" />
            تنظيف البيانات
          </button>
        </div>
      )}

      {/* Cloud Sync Tab */}
      {activeTab === 'cloudsync' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">مزامنة السحابة (Supabase)</h3>
            {/* مؤشر الحالة */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${
              syncStatus === 'synced'   ? 'bg-green-500 bg-opacity-20 text-green-300 border-green-500 border-opacity-30' :
              syncStatus === 'syncing'  ? 'bg-blue-500 bg-opacity-20 text-blue-300 border-blue-500 border-opacity-30' :
              syncStatus === 'error'    ? 'bg-red-500 bg-opacity-20 text-red-300 border-red-500 border-opacity-30' :
                                         'bg-gray-500 bg-opacity-20 text-gray-300 border-gray-500 border-opacity-30'
            }`}>
              {syncStatus === 'synced'  && <><CheckCircle className="h-4 w-4" /> متزامن</>}
              {syncStatus === 'syncing' && <><Loader className="h-4 w-4 animate-spin" /> جارٍ المزامنة...</>}
              {syncStatus === 'error'   && <><AlertTriangle className="h-4 w-4" /> خطأ في المزامنة</>}
              {syncStatus === 'offline' && <><WifiOff className="h-4 w-4" /> غير متصل بالإنترنت</>}
            </div>
          </div>

          {/* رسالة النتيجة */}
          {syncMessage.text && (
            <div className={`p-4 rounded-lg border ${
              syncMessage.type === 'success'
                ? 'bg-green-500 bg-opacity-20 border-green-500 border-opacity-30 text-green-300'
                : 'bg-red-500 bg-opacity-20 border-red-500 border-opacity-30 text-red-300'
            }`}>
              {syncMessage.text}
            </div>
          )}

          {/* أزرار المزامنة */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleManualSync}
              disabled={syncLoading || syncStatus === 'offline'}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 bg-opacity-80 hover:bg-opacity-100 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10 }}
            >
              {syncLoading
                ? <Loader className="h-5 w-5 animate-spin" />
                : <Cloud className="h-5 w-5" />
              }
              مزامنة الآن مع السحابة
            </button>

            <button
              onClick={loadTableSyncStats}
              disabled={syncLoading}
              className="flex items-center gap-2 px-4 py-3 bg-white bg-opacity-10 hover:bg-opacity-20 text-slate-800 rounded-lg font-semibold transition-all disabled:opacity-50"
              style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10 }}
            >
              <RefreshCw className="h-4 w-4" />
              تحديث الإحصائيات
            </button>

            <button
              onClick={handleMarkAllPending}
              disabled={syncLoading}
              className="flex items-center gap-2 px-4 py-3 bg-orange-500 bg-opacity-20 hover:bg-opacity-30 text-orange-300 border border-orange-500 border-opacity-30 rounded-lg font-semibold transition-all disabled:opacity-50"
              style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10 }}
              title="يضع جميع السجلات في وضع الانتظار للمزامنة للمرة القادمة"
            >
              <CloudLightning className="h-4 w-4" />
              فرض إعادة رفع الكل
            </button>
          </div>

          {/* تعليمات */}
          <div className="p-4 bg-blue-500 bg-opacity-10 border border-blue-500 border-opacity-20 rounded-lg text-sm text-blue-200 space-y-1">
            <p className="font-semibold text-blue-300">💡 كيفية التحقق من المزامنة:</p>
            <p>① اضغط <strong>"تحديث الإحصائيات"</strong> لرؤية عدد السجلات في كل جدول.</p>
            <p>② إذا كان عدد <strong className="text-yellow-300">"في الانتظار"</strong> أكبر من صفر، اضغط <strong>"مزامنة الآن"</strong>.</p>
            <p>③ بعد المزامنة، يجب أن يصبح عدد "في الانتظار" صفراً ويزيد عدد "متزامن".</p>
            <p>④ إذا لم تنجح المزامنة، اضغط <strong className="text-orange-300">"فرض إعادة رفع الكل"</strong> ثم جرب المزامنة مرة أخرى.</p>
          </div>

          {/* إحصائيات الجداول */}
          {Object.keys(tableSyncStats).length > 0 && (
            <div>
              <h4 className="text-slate-800 font-semibold mb-3">📊 حالة المزامنة لكل جدول:</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white border-opacity-10">
                      <th className="text-right pb-2 text-purple-200 font-medium">الجدول</th>
                      <th className="text-center pb-2 text-purple-200 font-medium">الإجمالي</th>
                      <th className="text-center pb-2 text-yellow-300 font-medium">في الانتظار</th>
                      <th className="text-center pb-2 text-green-300 font-medium">متزامن</th>
                      <th className="text-center pb-2 text-red-300 font-medium">محذوف</th>
                      <th className="text-center pb-2 text-gray-300 font-medium">بدون حالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(tableSyncStats).map(([store, s]) => (
                      <tr key={store} className="border-b border-white border-opacity-5 hover:bg-white hover:bg-opacity-5">
                        <td className="py-2 text-slate-800 font-medium">{store}</td>
                        <td className="py-2 text-center text-slate-800">{s.total}</td>
                        <td className="py-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            s.pending > 0 ? 'bg-yellow-500 bg-opacity-20 text-yellow-300' : 'text-gray-500'
                          }`}>{s.pending}</span>
                        </td>
                        <td className="py-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            s.synced > 0 ? 'bg-green-500 bg-opacity-20 text-green-300' : 'text-gray-500'
                          }`}>{s.synced}</span>
                        </td>
                        <td className="py-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            s.deleted > 0 ? 'bg-red-500 bg-opacity-20 text-red-300' : 'text-gray-500'
                          }`}>{s.deleted}</span>
                        </td>
                        <td className="py-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            s.noStatus > 0 ? 'bg-gray-500 bg-opacity-20 text-gray-300' : 'text-gray-500'
                          }`}>{s.noStatus}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {Object.keys(tableSyncStats).length === 0 && (
            <div className="text-center py-8 text-purple-200">
              <Cloud className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p>اضغط "تحديث الإحصائيات" لعرض حالة المزامنة</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DataManager;
