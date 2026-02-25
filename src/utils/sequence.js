// نظام تسلسل موحّد لأرقام الفواتير والورديات (بدون عشوائية)

const STORAGE_KEY = 'counters';

function loadCounters() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (_) {}
  // lastSegment: YYYYMM لتجميع الفواتير حسب الشهر، prefix قابل للتخصيص من إعدادات المتجر
  return { invoice: 1, shift: 1, lastSegment: '', prefix: 'INV', lastShiftId: null };
}

function saveCounters(counters) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counters));
  } catch (_) {}
}

function pad(num, size = 8) {
  const s = String(num);
  return s.length >= size ? s : '0'.repeat(size - s.length) + s;
}

function extractMaxNumericId(items = [], key, prefix) {
  let max = 0;
  for (const it of items) {
    const id = it?.[key];
    if (typeof id !== 'string') continue;
    // يدعم الصيغ: INV-00000012 أو INV-YYYYMM-00012
    // نلتقط آخر أرقام في المعرّف
    const tail = (id.match(/(\d+)$/) || [])[1];
    const n = tail ? parseInt(tail, 10) : null;
    if (n && n > max) max = n;
  }
  return max;
}

function ensureInitialized() {
  const counters = loadCounters();
  // عند أول تشغيل، استنتاج أعلى رقم موجود إن وجد
  const hasInitialized = localStorage.getItem(STORAGE_KEY) !== null;
  if (!hasInitialized) {
    try {
      const sales = JSON.parse(localStorage.getItem('sales') || '[]');
      const shifts = JSON.parse(localStorage.getItem('shifts') || '[]');
      // قراءة بادئة الفواتير من إعدادات المتجر إن وجدت
      const storeInfo = JSON.parse(localStorage.getItem('storeInfo') || '{}');
      counters.prefix = (storeInfo.invoicePrefix || 'INV').toUpperCase();
      const maxInvoice = extractMaxNumericId(sales, 'id', counters.prefix);
      const maxShift = extractMaxNumericId(shifts, 'id', 'SH');
      counters.invoice = Math.max(1, maxInvoice + 1);
      counters.shift = Math.max(1, maxShift + 1);
      counters.lastSegment = getCurrentMonthSegment();
      saveCounters(counters);
    } catch (_) {
      // في حال فشل القراءة نترك القيم الافتراضية
      saveCounters(counters);
    }
  }
  return counters;
}

function getCurrentMonthSegment() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}${m}`; // YYYYMM
}

export function getNextInvoiceId() {
  const counters = ensureInitialized();
  // ربط العدّاد بالوردية النشطة
  let activeShiftId = null;
  try {
    const activeShift = JSON.parse(localStorage.getItem('activeShift') || 'null');
    activeShiftId = activeShift?.id || null;
  } catch (_) {}

  if (activeShiftId && counters.lastShiftId !== activeShiftId) {
    // بدء وردية جديدة: تصفير عدّاد الفواتير
    counters.lastShiftId = activeShiftId;
    counters.invoice = 1;
  }

  const idNum = counters.invoice++;
  saveCounters(counters);
  // إرجاع رقم بسيط متصاعد بدون أصفار
  return String(idNum);
}

export function getNextShiftId() {
  const counters = ensureInitialized();
  const idNum = counters.shift++;
  saveCounters(counters);
  return `SH-${pad(idNum)}`;
}

export function peekCounters() {
  return loadCounters();
}

export default {
  getNextInvoiceId,
  getNextShiftId,
  peekCounters,
};


