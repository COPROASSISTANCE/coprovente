/* =========================================================================
   Stockage local (IndexedDB) — aucune donnée ne quitte le navigateur
   ========================================================================= */
const Store = (() => {
  let db;
  function open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('coprovente', 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        d.createObjectStore('dossiers', { keyPath: 'id' });
        const f = d.createObjectStore('files', { keyPath: 'id' });
        f.createIndex('dossierId', 'dossierId');
        d.createObjectStore('kv');
      };
      r.onsuccess = () => { db = r.result; res(db); };
      r.onerror = () => rej(r.error);
    });
  }
  function req(store, mode, op) {
    return new Promise((res, rej) => {
      const r = op(db.transaction(store, mode).objectStore(store));
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  return {
    open,
    allDossiers: () => req('dossiers', 'readonly', s => s.getAll()),
    putDossier: d => req('dossiers', 'readwrite', s => s.put(JSON.parse(JSON.stringify(d)))),
    delDossier: id => req('dossiers', 'readwrite', s => s.delete(id)),
    putFile: f => req('files', 'readwrite', s => s.put(f)),
    getFile: id => req('files', 'readonly', s => s.get(id)),
    delFile: id => req('files', 'readwrite', s => s.delete(id)),
    filesOf: dossierId => req('files', 'readonly', s => s.index('dossierId').getAll(dossierId)),
    allFiles: () => req('files', 'readonly', s => s.getAll()),
    get: k => req('kv', 'readonly', s => s.get(k)),
    set: (k, v) => req('kv', 'readwrite', s => s.put(v, k)),
    async clearAll() {
      for (const st of ['dossiers', 'files', 'kv']) await req(st, 'readwrite', s => s.clear());
    },
  };
})();
