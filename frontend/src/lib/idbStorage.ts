import type { StateStorage } from 'zustand/middleware';

const DB_NAME = 'mpbd-store';
const STORE_NAME = 'keyval';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const dbPromise = openDB();

export const idbStorage: StateStorage = {
  async getItem(name) {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE_NAME).objectStore(STORE_NAME).get(name);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  },
  async setItem(name, value) {
    const db = await dbPromise;
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).put(value, name);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },
  async removeItem(name) {
    const db = await dbPromise;
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).delete(name);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },
};
