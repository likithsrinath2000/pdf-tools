const DB_NAME = 'pdftools-cache';
const DB_VERSION = 1;
const STORE_NAME = 'thumbnails';
const MAX_CACHE_SIZE = 100;
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;

interface CachedThumbnail {
  key: string;
  data: string;
  timestamp: number;
}

let db: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;

function initDB(): Promise<IDBDatabase> {
  if (db) return Promise.resolve(db);
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.warn('IndexedDB not available, using memory cache');
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });

  return dbInitPromise;
}

const memoryCache = new Map<string, string>();

export async function getCachedThumbnail(key: string): Promise<string | null> {
  if (memoryCache.has(key)) {
    return memoryCache.get(key)!;
  }

  try {
    const database = await initDB();
    return new Promise((resolve) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result as CachedThumbnail | undefined;
        if (result && Date.now() - result.timestamp < CACHE_EXPIRY_MS) {
          memoryCache.set(key, result.data);
          resolve(result.data);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setCachedThumbnail(key: string, data: string): Promise<void> {
  memoryCache.set(key, data);

  try {
    const database = await initDB();
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const countRequest = store.count();
    countRequest.onsuccess = () => {
      if (countRequest.result >= MAX_CACHE_SIZE) {
        const index = store.index('timestamp');
        const cursorRequest = index.openCursor();
        let deleted = 0;
        const toDelete = Math.floor(MAX_CACHE_SIZE * 0.2);

        cursorRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor && deleted < toDelete) {
            store.delete(cursor.primaryKey);
            deleted++;
            cursor.continue();
          }
        };
      }
    };

    store.put({
      key,
      data,
      timestamp: Date.now(),
    } as CachedThumbnail);
  } catch {
  }
}

export function generateCacheKey(fileHash: string, pageNum: number, scale: number): string {
  return `${fileHash}-p${pageNum}-s${scale}`;
}

export async function getFileHash(file: File): Promise<string> {
  const slice = await file.slice(0, 1024).arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', slice);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `${file.name}-${file.size}-${hashHex.substring(0, 16)}`;
}

export async function clearThumbnailCache(): Promise<void> {
  memoryCache.clear();
  try {
    const database = await initDB();
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
  } catch {
  }
}
