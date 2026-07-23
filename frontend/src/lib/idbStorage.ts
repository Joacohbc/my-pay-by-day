import type { StateStorage } from 'zustand/middleware';
import { logger, type Logger } from '@/lib/logger';

// Resolved per call, never at module scope: this module is part of the
// logger → errorReporter → errorLogStore → idbStorage cycle, so at evaluation time `logger` may
// still be uninitialized depending on which module the bundler enters first.
function idbLog(): Logger {
  return logger.child('idb');
}

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
    request.onerror = () => {
      idbLog().debug('IndexedDB open failed', { error: String(request.error) });
      reject(request.error);
    };
  });
}

const dbPromise = openDB();

// --- Core Reusable IDB Methods ---

export async function idbGet(name: string): Promise<string | null> {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME).objectStore(STORE_NAME).get(name);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => {
      idbLog().debug('IndexedDB read failed', { error: String(req.error), key: name });
      reject(req.error);
    };
  });
}

export async function idbSet(name: string, value: string): Promise<void> {
  const db = await dbPromise;
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).put(value, name);
    req.onsuccess = () => resolve();
    req.onerror = () => {
      idbLog().debug('IndexedDB write failed', { error: String(req.error), key: name });
      reject(req.error);
    };
  });
}

export async function idbRemove(name: string): Promise<void> {
  const db = await dbPromise;
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).delete(name);
    req.onsuccess = () => resolve();
    req.onerror = () => {
      idbLog().debug('IndexedDB delete failed', { error: String(req.error), key: name });
      reject(req.error);
    };
  });
}

// --- Specific Implementations ---

/**
 * Interface implementation for Zustand's `persist` middleware.
 */
export const zustandStorage: StateStorage = {
  getItem: idbGet,
  setItem: idbSet,
  removeItem: idbRemove,
};

/**
 * Interface implementation for React Query's `createAsyncStoragePersister`.
 * The storage interface requires values to be returned and accepts string | null 
 * and requires methods getItem, setItem, removeItem to return promises.
 */
export const queryStorage = {
  getItem: idbGet,
  setItem: idbSet,
  removeItem: idbRemove,
};