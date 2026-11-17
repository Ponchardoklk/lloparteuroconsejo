// Archivos y movimientos que añade el usuario (facturas subidas, gastos manuales).
// Se guardan en el navegador (IndexedDB). Para compartirlos entre equipos habría que
// conectar esta capa a un servidor o a un almacenamiento en la nube con la misma interfaz.

const DB_NAME = 'llopart-biblioteca';
const STORE = 'entries';
let dbPromise = null;
const memory = []; // si IndexedDB no está disponible (modo privado, vistas previas...)

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const os = req.result.createObjectStore(STORE, { keyPath: 'id' });
        os.createIndex('pid', 'pid');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

export async function listEntries(pid) {
  const db = await open();
  if (!db) return memory.filter((e) => e.pid === pid);
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE).objectStore(STORE).index('pid').getAll(pid);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve(memory.filter((e) => e.pid === pid));
    } catch {
      resolve(memory.filter((e) => e.pid === pid));
    }
  });
}

export async function saveEntry(entry) {
  const db = await open();
  if (!db) {
    memory.push(entry);
    return entry;
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(entry);
      tx.oncomplete = () => resolve(entry);
      tx.onerror = () => {
        memory.push(entry);
        resolve(entry);
      };
    } catch {
      memory.push(entry);
      resolve(entry);
    }
  });
}

export async function deleteEntry(id) {
  const i = memory.findIndex((e) => e.id === id);
  if (i >= 0) memory.splice(i, 1);
  const db = await open();
  if (!db) return;
  await new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    } catch {
      resolve();
    }
  });
}
