// Личные файлы к заданиям хранятся в IndexedDB браузера (только на этом устройстве).

const DB_NAME = 'ugg-files';
const STORE = 'files';

interface StoredFile {
  name: string;
  type: string;
  blob: Blob;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const saveFile = (id: string, file: File) =>
  tx('readwrite', (s) => s.put({ name: file.name, type: file.type, blob: file } satisfies StoredFile, id));

export const deleteFile = (id: string) => tx('readwrite', (s) => s.delete(id));

export const getFile = (id: string) => tx<StoredFile | undefined>('readonly', (s) => s.get(id));

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
