// Keeps daily-puzzle mimic recordings on this device (IndexedDB), so players can
// replay earlier attempts after a reload. Everything fails soft: if storage isn't
// available, mimics just aren't remembered.
const DB = 'yelnats';
const STORE = 'mimics';
const KEEP_PUZZLES = 7;

function open() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error('no indexedDB'));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { keyPath: 'id' });
      store.createIndex('puzzle', 'puzzle');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const result = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(result && 'result' in result ? result.result : undefined);
    t.onerror = () => reject(t.error);
  });
}

/** Saves mimic number `index` (1-based) for a puzzle. */
export async function saveMimic(puzzle, index, blob) {
  try {
    const db = await open();
    // Stored as plain bytes, not a Blob: Safari can't store Blobs in some modes
    // (private tabs, some versions), which silently lost the recordings.
    const bytes = await blob.arrayBuffer();
    await tx(db, 'readwrite', (s) => s.put({ id: `${puzzle}:${index}`, puzzle, index, bytes, type: blob.type, at: Date.now() }));
    // Forget mimics from puzzles more than a week old.
    await tx(db, 'readwrite', (s) => {
      const req = s.index('puzzle').openCursor(IDBKeyRange.upperBound(puzzle - KEEP_PUZZLES));
      req.onsuccess = () => {
        const c = req.result;
        if (c) {
          c.delete();
          c.continue();
        }
      };
    });
  } catch (e) {
    // not remembered; fine
  }
}

/** All saved mimics for a puzzle, oldest first: [{ index, blob }]. */
export async function listMimics(puzzle) {
  try {
    const db = await open();
    const rows = await tx(db, 'readonly', (s) => s.index('puzzle').getAll(puzzle));
    return (rows || [])
      .sort((a, b) => a.index - b.index)
      .map((r) => ({ index: r.index, blob: r.blob || new Blob([r.bytes], { type: r.type || 'audio/webm' }) })); // r.blob: older saves
  } catch (e) {
    return [];
  }
}
