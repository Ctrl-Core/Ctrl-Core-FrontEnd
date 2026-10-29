/**
 * ADAPTADOR · IndexedDB con promesas (almacén clave-valor por "object store").
 * Pensado para datos que no caben en localStorage (registro auditable de automatizaciones, caché sin conexión).
 * store.js sigue siendo el puerto síncrono de estado; este adaptador es la vía de migración a persistencia asíncrona.
 */
const DB_NAME = 'cde-unab';
const DB_VERSION = 1;
export const STORES = Object.freeze({ KV: 'kv', AUTO_LOG: 'autoLog' });

let dbPromise = null;

export function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = globalThis.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => { for (const name of Object.values(STORES)) if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbPromise = null; reject(req.error); };
  });
  return dbPromise;
}

async function tx(storeName, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeName, mode), req = fn(t.objectStore(storeName));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export const idb = {
  get: (store, key) => tx(store, 'readonly', s => s.get(key)),
  set: (store, key, value) => tx(store, 'readwrite', s => s.put(value, key)),
  delete: (store, key) => tx(store, 'readwrite', s => s.delete(key)),
  getAll: store => tx(store, 'readonly', s => s.getAll()),
  clear: store => tx(store, 'readwrite', s => s.clear())
};
