
const DB_NAME = 'fleetdost-offline-db';
const STORE_NAME = 'sync-queue';
const USER_STORE = 'user-session';
const DB_VERSION = 3;
const SYNC_TAG = 'fleetdost-sync';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(new Error("Failed to open IndexedDB."));
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as any).result;
        // Ensure sync-queue exists
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { autoIncrement: true });
        }
        // Ensure user-session exists (Shared with Firebase Service)
        if (!db.objectStoreNames.contains(USER_STORE)) {
          db.createObjectStore(USER_STORE);
        }
      };
    });
  }
  return dbPromise;
}

export async function addToQueue(action: any) {
  const db = await getDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(action);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error("Failed to add to sync queue."));
  });
}

export async function getQueue() {
  const db = await getDB();
  return new Promise<any[]>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const items: any[] = [];
    const cursorRequest = store.openCursor();
    cursorRequest.onsuccess = (e: any) => {
      const cursor = e.target.result;
      if (cursor) {
        items.push({ key: cursor.key, ...cursor.value });
        cursor.continue();
      } else {
        resolve(items);
      }
    };
    cursorRequest.onerror = () => reject("Failed to query queue");
  });
}

export async function removeFromQueue(key: IDBValidKey) {
  const db = await getDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject("Failed to delete from queue");
  });
}

export async function registerBackgroundSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const sw = await navigator.serviceWorker.ready;
      await sw.sync.register(SYNC_TAG);
      console.log('Background sync tag registered:', SYNC_TAG);
    } catch (e) {
      console.error('Background sync registration failed:', e);
    }
  }
}
