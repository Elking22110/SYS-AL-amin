import { createClient } from '@supabase/supabase-js';

// القيم الاحتياطية المباشرة تضمن الاتصال دائماً حتى لو .env لم يُحمَّل
const FALLBACK_URL = 'https://jwjjykrrnlnitelcgzfy.supabase.co';
const FALLBACK_KEY = 'sb_publishable_NZWEAHXuHWyBfPFwUgMahQ_Z3LHrg8k';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY;

// التحقق من صحة وجود المفاتيح
const isKeysConfigured = 
  supabaseUrl && 
  supabaseUrl !== 'https://your-project-id.supabase.co' && 
  supabaseAnonKey && 
  supabaseAnonKey !== 'your-supabase-anon-key-here';

// Singleton pattern - منع إنشاء أكثر من instance واحد
const GLOBAL_KEY = '__supabase_singleton__';

let supabase = null;

if (isKeysConfigured) {
  try {
    // استخدام instance موجود إذا كان هناك واحد (تجنب Multiple GoTrueClient)
    if (window[GLOBAL_KEY]) {
      supabase = window[GLOBAL_KEY];
    } else {
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,  // لا نحتاج session للـ POS
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });
      window[GLOBAL_KEY] = supabase;
      console.log('✅ تم تهيئة اتصال Supabase بنجاح - المزامنة السحابية نشطة');
    }
  } catch (err) {
    console.error('❌ فشل تهيئة اتصال Supabase:', err);
  }
} else {
  console.warn('⚠️ لم يتم تكوين بيانات الاتصال بـ Supabase في ملف .env - يعمل النظام محلياً بالكامل (Offline Mode)');
}

export { supabase, isKeysConfigured };
