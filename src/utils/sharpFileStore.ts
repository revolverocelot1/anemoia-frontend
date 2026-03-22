/**
 * SharpFileStore - IndexedDB persistence for large PLY blobs
 * Used to pass generated SHARP files to the splat viewer
 * without base64 overhead or memory issues
 */

const DB_NAME = 'sharp-file-store';
const DB_VERSION = 1;
const STORE_NAME = 'generated-files';

export interface StoredFile {
  id: string;
  filename: string;
  blob: Blob;
  size: number;
  createdAt: Date;
  metadata?: {
    defaultFov?: number;
    gaussianCount?: number;
    focalLength?: number;
    width?: number;
    height?: number;
    originalFov?: number;
    viewerCalibration?: {
      boundsMin?: [number, number, number];
      boundsMax?: [number, number, number];
      center?: [number, number, number];
      focusDepth?: number;
      cameraSpace?: boolean;
      frontBeta?: number;
      parallaxBeta?: number;
    };
    processingTimeMs?: number;
    fileSize?: number;
  };
}

class SharpFileStoreClass {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[SharpFileStore] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('filename', 'filename', { unique: false });
        }
      };
    });

    return this.dbPromise;
  }

  async store(file: StoredFile): Promise<string> {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.put(file);
      
      request.onsuccess = () => {
        console.log(`[SharpFileStore] Stored file: ${file.filename} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        resolve(file.id);
      };
      
      request.onerror = () => {
        console.error('[SharpFileStore] Failed to store file:', request.error);
        reject(request.error);
      };
    });
  }

  async get(id: string): Promise<StoredFile | null> {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.get(id);
      
      request.onsuccess = () => {
        const result = request.result as StoredFile | undefined;
        if (result) {
          console.log(`[SharpFileStore] Retrieved file: ${result.filename}`);
        }
        resolve(result || null);
      };
      
      request.onerror = () => {
        console.error('[SharpFileStore] Failed to get file:', request.error);
        reject(request.error);
      };
    });
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.delete(id);
      
      request.onsuccess = () => {
        console.log(`[SharpFileStore] Deleted file: ${id}`);
        resolve();
      };
      
      request.onerror = () => {
        console.error('[SharpFileStore] Failed to delete file:', request.error);
        reject(request.error);
      };
    });
  }

  async list(): Promise<StoredFile[]> {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async cleanup(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    try {
      const files = await this.list();
      const cutoff = Date.now() - maxAgeMs;
      let deleted = 0;

      for (const file of files) {
        const fileTime = new Date(file.createdAt).getTime();
        if (fileTime < cutoff) {
          await this.delete(file.id);
          deleted++;
        }
      }

      if (deleted > 0) {
        console.log(`[SharpFileStore] Cleaned up ${deleted} old files`);
      }

      return deleted;
    } catch (error) {
      console.warn('[SharpFileStore] Cleanup failed:', error);
      return 0;
    }
  }

  async getStorageUsed(): Promise<number> {
    const files = await this.list();
    return files.reduce((total, file) => total + file.size, 0);
  }

  generateId(): string {
    return `sharp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

export const sharpFileStore = new SharpFileStoreClass();

export const createBlobUrl = (blob: Blob): string => {
  return URL.createObjectURL(blob);
};

export const revokeBlobUrl = (url: string): void => {
  URL.revokeObjectURL(url);
};


