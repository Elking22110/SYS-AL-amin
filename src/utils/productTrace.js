/**
 * Product write tracer — logs every mutation affecting a single product ID.
 * Arm trace: window.__TRACE_PRODUCT_ID__ = '<id>'  OR  ?traceProduct=<id>
 * Timeline: window.__productTraceTimeline__
 */
const ENDPOINT = 'http://127.0.0.1:7421/ingest/baaa0d01-24a0-4303-a164-d2aca3efeaa4';
const SESSION = '8d1c3e';

const timeline = [];
if (typeof window !== 'undefined') {
  window.__productTraceTimeline__ = timeline;
}

function getTraceId() {
  if (typeof window === 'undefined') return null;
  if (window.__TRACE_PRODUCT_ID__) return String(window.__TRACE_PRODUCT_ID__);
  try {
    const fromLs = localStorage.getItem('trace_product_id');
    if (fromLs) return String(fromLs);
  } catch (_) {}
  try {
    const p = new URLSearchParams(window.location.search);
    const q = p.get('traceProduct');
    if (q) return String(q);
  } catch (_) {}
  return null;
}

function fmtTs(ts = Date.now()) {
  const d = new Date(ts);
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

function priceOf(p) {
  if (p == null) return null;
  if (typeof p === 'number') return p;
  if (typeof p === 'object' && 'price' in p) return p.price;
  return null;
}

function snap(p) {
  if (!p || typeof p !== 'object') return null;
  return {
    price: p.price,
    sync_status: p.sync_status,
    updated_at: p.updated_at,
    name: p.name
  };
}

function findInArray(arr, id) {
  if (!Array.isArray(arr)) return null;
  return arr.find((x) => x && String(x.id) === String(id)) || null;
}

export function armProductTrace(productId) {
  if (typeof window === 'undefined' || productId == null) return;
  window.__TRACE_PRODUCT_ID__ = String(productId);
  try { localStorage.setItem('trace_product_id', String(productId)); } catch (_) {}
  trace('productTrace', 'ARMED', null, { id: String(productId) }, { productId: String(productId) });
}

export function trace(source, action, oldVal, newVal, meta = {}) {
  const productId = meta.productId || getTraceId();
  if (!productId) return;

  const oldPrice = priceOf(oldVal);
  const newPrice = priceOf(newVal);
  const oldSnap = typeof oldVal === 'object' && oldVal !== null && !Array.isArray(oldVal) ? snap(oldVal) : oldVal;
  const newSnap = typeof newVal === 'object' && newVal !== null && !Array.isArray(newVal) ? snap(newVal) : newVal;

  const entry = {
    ts: Date.now(),
    time: fmtTs(),
    source,
    action,
    productId: String(productId),
    oldPrice,
    newPrice,
    old: oldSnap,
    new: newSnap,
    meta: { ...meta, stack: meta.stack || (new Error().stack || '').split('\n').slice(1, 4).join(' | ') }
  };

  timeline.push(entry);

  const arrow = oldPrice != null && newPrice != null && oldPrice !== newPrice
    ? `${oldPrice} → ${newPrice}`
    : (newPrice != null ? String(newPrice) : JSON.stringify(newSnap));

  console.log(
    `%c[ProductTrace] ${entry.time} | ${source} | ${action} | ${arrow}`,
    oldPrice != null && newPrice != null && oldPrice !== newPrice ? 'color:#e11d48;font-weight:bold' : 'color:#6366f1',
    entry
  );
}

export function traceProductObject(source, action, oldProduct, newProduct, meta = {}) {
  const id = meta.productId || newProduct?.id || oldProduct?.id || getTraceId();
  if (!id) return;
  if (getTraceId() && String(id) !== String(getTraceId())) return;
  trace(source, action, oldProduct, newProduct, { ...meta, productId: String(id) });
}

export function traceProductsArray(source, action, oldArray, newArray, meta = {}) {
  const productId = meta.productId || getTraceId();
  if (!productId) return;
  const oldP = findInArray(oldArray, productId);
  const newP = findInArray(newArray, productId);
  if (!oldP && !newP) return;
  if (oldP?.price === newP?.price && oldP?.sync_status === newP?.sync_status && oldP?.updated_at === newP?.updated_at) return;
  trace(source, action, oldP, newP, { ...meta, productId: String(productId), arrayLen: Array.isArray(newArray) ? newArray.length : null });
}

export function traceSupabaseResponse(source, productId, cloudRow, meta = {}) {
  if (!productId || (getTraceId() && String(productId) !== String(getTraceId()))) return;
  trace(source, 'supabase_response', null, { price: cloudRow?.price, sync_status: 'cloud', updated_at: cloudRow?.updated_at }, { ...meta, productId: String(productId) });
}

export function getTracedProductId() {
  return getTraceId();
}

export function printProductTimeline() {
  console.table(timeline.map((e) => ({
    time: e.time,
    source: e.source,
    action: e.action,
    oldPrice: e.oldPrice,
    newPrice: e.newPrice
  })));
  return timeline;
}

if (typeof window !== 'undefined') {
  window.armProductTrace = armProductTrace;
  window.printProductTimeline = printProductTimeline;
}
