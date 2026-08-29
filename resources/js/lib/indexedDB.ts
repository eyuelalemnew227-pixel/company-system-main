/**
 * IndexedDB wrapper for offline data storage
 */

const DB_NAME = 'KaldisOfflineDB';
const DB_VERSION = 1;

// Store names
export const STORES = {
    INVENTORY_COUNTS: 'inventoryCounts',
    EVALUATIONS: 'evaluations',
    SYNC_QUEUE: 'syncQueue',
    CACHED_DATA: 'cachedData',
} as const;

export interface SyncQueueItem {
    id?: number;
    type: 'create' | 'update' | 'delete';
    entity: string;
    data: any;
    timestamp: number;
    status: 'pending' | 'syncing' | 'failed' | 'completed';
    attempts: number;
    error?: string;
}

class IndexedDBWrapper {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<IDBDatabase> | null = null;

    async init(): Promise<IDBDatabase> {
        if (this.db) {
            return this.db;
        }

        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                reject(new Error('Failed to open IndexedDB'));
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create inventory counts store
                if (!db.objectStoreNames.contains(STORES.INVENTORY_COUNTS)) {
                    const inventoryStore = db.createObjectStore(STORES.INVENTORY_COUNTS, {
                        keyPath: 'localId',
                        autoIncrement: true,
                    });
                    inventoryStore.createIndex('product_id', 'product_id', { unique: false });
                    inventoryStore.createIndex('branch_id', 'branch_id', { unique: false });
                    inventoryStore.createIndex('inventory_period_id', 'inventory_period_id', {
                        unique: false,
                    });
                    inventoryStore.createIndex('synced', 'synced', { unique: false });
                }

                // Create evaluations store
                if (!db.objectStoreNames.contains(STORES.EVALUATIONS)) {
                    const evalStore = db.createObjectStore(STORES.EVALUATIONS, {
                        keyPath: 'localId',
                        autoIncrement: true,
                    });
                    evalStore.createIndex('evaluation_id', 'evaluation_id', { unique: false });
                    evalStore.createIndex('synced', 'synced', { unique: false });
                }

                // Create sync queue store
                if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
                    const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, {
                        keyPath: 'id',
                        autoIncrement: true,
                    });
                    syncStore.createIndex('status', 'status', { unique: false });
                    syncStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Create cached data store
                if (!db.objectStoreNames.contains(STORES.CACHED_DATA)) {
                    const cacheStore = db.createObjectStore(STORES.CACHED_DATA, {
                        keyPath: 'key',
                    });
                    cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });

        return this.initPromise;
    }

    async add<T>(storeName: string, data: T): Promise<IDBValidKey> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async put<T>(storeName: string, data: T): Promise<IDBValidKey> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll<T>(storeName: string): Promise<T[]> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllByIndex<T>(
        storeName: string,
        indexName: string,
        query?: IDBValidKey | IDBKeyRange | boolean | any,
    ): Promise<T[]> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = query ? index.getAll(query) : index.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName: string, key: IDBValidKey): Promise<void> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async clear(storeName: string): Promise<void> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async count(storeName: string): Promise<number> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.count();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

// Singleton instance
export const db = new IndexedDBWrapper();
