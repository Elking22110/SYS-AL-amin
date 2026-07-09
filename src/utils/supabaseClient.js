import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// التحقق من صحة وجود المفاتيح وتفادي قيم النماذج الافتراضية
const isKeysConfigured = 
  supabaseUrl && 
  supabaseUrl !== 'https://your-project-id.supabase.co' && 
  supabaseAnonKey && 
  supabaseAnonKey !== 'your-supabase-anon-key-here';

let supabase = null;

if (isKeysConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ تم تهيئة اتصال Supabase بنجاح');
  } catch (err) {
    console.error('❌ فشل تهيئة اتصال Supabase:', err);
  }
} else {
  console.warn('⚠️ لم يتم تكوين بيانات الاتصال بـ Supabase في ملف .env - يعمل النظام محلياً بالكامل (Offline Mode)');
}

export { supabase, isKeysConfigured };
