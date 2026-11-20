import { SavedPhoto, SyncQueueItem, AppSettings } from '../types';

const DB_NAME = 'NikiKioskOfflineDB';
const DB_VERSION = 1;

class LocalDataStorage {
  private db: IDBDatabase | null = null;
  private isReady: Promise<boolean>;

  constructor() {
    this.isReady = this.initDB();
  }

  private initDB(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        console.warn('IndexedDB not supported in this environment');
        resolve(false);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('photos')) {
          const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
          photoStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('syncQueue')) {
          const queueStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
          queueStore.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains('logs')) {
          const logStore = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
          logStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(true);
      };

      request.onerror = (e) => {
        console.error('IndexedDB open error:', e);
        resolve(false);
      };
    });
  }

  public async savePhoto(photo: SavedPhoto): Promise<void> {
    await this.isReady;
    if (!this.db) {
      // Fallback to localStorage if IndexedDB is unavailable
      const existing = this.getLocalStorageItem<SavedPhoto[]>('niki_photos', []);
      existing.unshift(photo);
      localStorage.setItem('niki_photos', JSON.stringify(existing.slice(0, 30)));
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction('photos', 'readwrite');
        const store = tx.objectStore('photos');
        store.put(photo);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async getAllPhotos(): Promise<SavedPhoto[]> {
    await this.isReady;
    if (!this.db) {
      return this.getLocalStorageItem<SavedPhoto[]>('niki_photos', []);
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('photos', 'readonly');
        const store = tx.objectStore('photos');
        const request = store.getAll();
        request.onsuccess = () => {
          const results = (request.result as SavedPhoto[]) || [];
          results.sort((a, b) => b.timestamp - a.timestamp);
          resolve(results);
        };
        request.onerror = () => {
          resolve(this.getLocalStorageItem<SavedPhoto[]>('niki_photos', []));
        };
      } catch {
        resolve(this.getLocalStorageItem<SavedPhoto[]>('niki_photos', []));
      }
    });
  }

  public async deletePhoto(id: string): Promise<void> {
    await this.isReady;
    if (!this.db) {
      const existing = this.getLocalStorageItem<SavedPhoto[]>('niki_photos', []);
      localStorage.setItem('niki_photos', JSON.stringify(existing.filter((p) => p.id !== id)));
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('photos', 'readwrite');
        const store = tx.objectStore('photos');
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async clearAllExceptChosen(chosenDataUrl?: string): Promise<void> {
    await this.isReady;
    if (!this.db) {
      const existing = this.getLocalStorageItem<SavedPhoto[]>('niki_photos', []);
      const filtered = chosenDataUrl ? existing.filter((p) => p.dataUrl === chosenDataUrl) : [];
      localStorage.setItem('niki_photos', JSON.stringify(filtered));
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('photos', 'readwrite');
        const store = tx.objectStore('photos');
        const req = store.getAll();
        req.onsuccess = () => {
          const all = (req.result as SavedPhoto[]) || [];
          for (const item of all) {
            if (!chosenDataUrl || item.dataUrl !== chosenDataUrl) {
              store.delete(item.id);
            }
          }
          resolve();
        };
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async clearAllPhotos(): Promise<void> {
    return this.clearAllExceptChosen();
  }

  public async enqueueSyncItem(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries' | 'status'>): Promise<string> {
    await this.isReady;
    const fullItem: SyncQueueItem = {
      ...item,
      id: 'sync_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
    };

    if (!this.db) {
      const queue = this.getLocalStorageItem<SyncQueueItem[]>('niki_sync_queue', []);
      queue.push(fullItem);
      localStorage.setItem('niki_sync_queue', JSON.stringify(queue));
      return fullItem.id;
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('syncQueue', 'readwrite');
        const store = tx.objectStore('syncQueue');
        store.put(fullItem);
        tx.oncomplete = () => resolve(fullItem.id);
        tx.onerror = () => resolve(fullItem.id);
      } catch {
        resolve(fullItem.id);
      }
    });
  }

  public async getSyncQueue(): Promise<SyncQueueItem[]> {
    await this.isReady;
    if (!this.db) {
      return this.getLocalStorageItem<SyncQueueItem[]>('niki_sync_queue', []);
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('syncQueue', 'readonly');
        const store = tx.objectStore('syncQueue');
        const request = store.getAll();
        request.onsuccess = () => resolve((request.result as SyncQueueItem[]) || []);
        request.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  public async removeSyncItem(id: string): Promise<void> {
    await this.isReady;
    if (!this.db) {
      const queue = this.getLocalStorageItem<SyncQueueItem[]>('niki_sync_queue', []);
      localStorage.setItem('niki_sync_queue', JSON.stringify(queue.filter((q) => q.id !== id)));
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('syncQueue', 'readwrite');
        const store = tx.objectStore('syncQueue');
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async clearAll(): Promise<void> {
    await this.isReady;
    if (this.db) {
      try {
        const tx = this.db.transaction(['photos', 'syncQueue', 'logs'], 'readwrite');
        tx.objectStore('photos').clear();
        tx.objectStore('syncQueue').clear();
        tx.objectStore('logs').clear();
      } catch (e) {
        console.error(e);
      }
    }
    localStorage.removeItem('niki_photos');
    localStorage.removeItem('niki_sync_queue');
    localStorage.removeItem('niki_logs');
  }

  // App Settings in LocalStorage
  public getSettings(): AppSettings {
    const defaults: AppSettings = {
      isOfflineMode: true, // Default to offline simulator so the app works immediately and reliably
      backendHost: 'niki2.evnchn.io',
      autoSpeakTTS: true,
      soundVolume: 0.9,
      deviceIdiom: 'pad',
      cameraFacing: 'user',
      demoName: 'Candbot',
      voicePreset: 'friendly_feminine',
      voicePitch: 1.45,
      voiceRate: 1.0,
    };
    return this.getLocalStorageItem<AppSettings>('niki_settings', defaults);
  }

  public saveSettings(settings: AppSettings): void {
    localStorage.setItem('niki_settings', JSON.stringify(settings));
  }

  private getLocalStorageItem<T>(key: string, fallback: T): T {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch {
      return fallback;
    }
  }
}

export const localStore = new LocalDataStorage();
