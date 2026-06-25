/**
 * Storage Service - Abstracts data persistence
 *
 * Switches from localStorage to IndexedDB to prevent QuotaExceededError
 * when importing large Excel sheets.
 * Swapping these calls to fetch/axios API calls is very easy if a backend is added.
 *
 * All components interact with data ONLY through this service.
 */

const DB_NAME = "AdaniShipmentDB";
const STORE_NAME = "collections";

/**
 * Helper to open and initialize the IndexedDB database
 */
function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get an item by key
 */
function getItem<T>(key: string): Promise<T | null> {
  return getDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve((request.result as T) || null);
      request.onerror = () => reject(request.error);
    });
  });
}

/**
 * Set value for key
 */
function setItem<T>(key: string, value: T): Promise<void> {
  return getDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

/**
 * Remove key from store
 */
function removeItem(key: string): Promise<void> {
  return getDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

/**
 * Get all keys in database
 */
function getAllKeys(): Promise<string[]> {
  return getDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(request.error);
    });
  });
}

/**
 * Generic storage service that mimics a REST-like data layer.
 * All methods are asynchronous and return Promises.
 */
export const storageService = {
  /**
   * Get all items from a collection
   * Future: GET /api/{collection}
   */
  getAll: async <T>(collection: string): Promise<T[]> => {
    try {
      const data = await getItem<T[]>(collection);
      return data || [];
    } catch (error) {
      console.error(`Error reading ${collection}:`, error);
      return [];
    }
  },

  /**
   * Get a single item by ID
   * Future: GET /api/{collection}/{id}
   */
  getById: async <T extends { id: string }>(collection: string, id: string): Promise<T | null> => {
    const items = await storageService.getAll<T>(collection);
    return items.find((item) => item.id === id) || null;
  },

  /**
   * Create a new item in a collection
   * Future: POST /api/{collection}
   */
  create: async <T extends { id: string }>(collection: string, item: T): Promise<T> => {
    const items = await storageService.getAll<T>(collection);
    items.push(item);
    await setItem(collection, items);
    return item;
  },

  /**
   * Update an existing item
   * Future: PUT /api/{collection}/{id}
   */
  update: async <T extends { id: string }>(collection: string, id: string, updates: Partial<T>): Promise<T | null> => {
    const items = await storageService.getAll<T>(collection);
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return null;

    items[index] = { ...items[index], ...updates };
    await setItem(collection, items);
    return items[index];
  },

  /**
   * Delete an item by ID
   * Future: DELETE /api/{collection}/{id}
   */
  delete: async <T extends { id: string }>(collection: string, id: string): Promise<boolean> => {
    const items = await storageService.getAll<T>(collection);
    const filtered = items.filter((item) => item.id !== id);
    if (filtered.length === items.length) return false;

    await setItem(collection, filtered);
    return true;
  },

  /**
   * Replace entire collection (useful for bulk imports like Excel)
   * Future: PUT /api/{collection}/bulk
   */
  bulkReplace: async <T>(collection: string, items: T[]): Promise<void> => {
    await setItem(collection, items);
  },

  /**
   * Clear a collection
   * Future: DELETE /api/{collection}
   */
  clear: async (collection: string): Promise<void> => {
    await removeItem(collection);
  },

  /**
   * Export all data (for backup/debugging)
   */
  exportAll: async (): Promise<Record<string, unknown[]>> => {
    const keys = await getAllKeys();
    const data: Record<string, unknown[]> = {};
    for (const key of keys) {
      data[key] = await storageService.getAll(key);
    }
    return data;
  },
};
