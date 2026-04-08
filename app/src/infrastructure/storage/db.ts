import type { SessionProfile, SessionRecord } from '../../domain/shared/types';
import { STARTER_PROFILE } from '../../domain/shared/profile';

export interface AppSettings {
  selectedProfileId: string;
}

export interface AppSnapshot {
  profiles: SessionProfile[];
  settings: AppSettings;
  sessions: SessionRecord[];
}

const DB_NAME = 'hiit-master';
const STORE_NAME = 'app';
const SNAPSHOT_KEY = 'snapshot';

const DEFAULT_SNAPSHOT: AppSnapshot = {
  profiles: [STARTER_PROFILE],
  settings: {
    selectedProfileId: STARTER_PROFILE.id
  },
  sessions: []
};

function openExistingDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    let existed = true;

    request.onupgradeneeded = () => {
      existed = false;
      request.result.close();
      indexedDB.deleteDatabase(DB_NAME);
    };

    request.onsuccess = () => {
      if (!existed) {
        resolve(null);
        return;
      }
      resolve(request.result);
    };

    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('IndexedDB open blocked'));
  });
}

function upgradeDatabase(version: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, version);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('IndexedDB upgrade blocked'));
  });
}

async function openDatabase(): Promise<IDBDatabase> {
  const existing = await openExistingDatabase();

  if (!existing) {
    return upgradeDatabase(1);
  }

  if (existing.objectStoreNames.contains(STORE_NAME)) {
    return existing;
  }

  const nextVersion = existing.version + 1;
  existing.close();
  return upgradeDatabase(nextVersion);
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => void | Promise<T>): Promise<T> {
  const database = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    void Promise.resolve(run(store))
      .then((value) => resolve(value as T))
      .catch(reject);
    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => database.close();
  });
}

export async function loadSnapshot(): Promise<AppSnapshot> {
  return withStore('readonly', (store) => {
    return new Promise<AppSnapshot>((resolve, reject) => {
      const request = store.get(SNAPSHOT_KEY);
      request.onsuccess = () => resolve((request.result as AppSnapshot | undefined) ?? DEFAULT_SNAPSHOT);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function saveSnapshot(snapshot: AppSnapshot): Promise<void> {
  return withStore('readwrite', (store) => {
    return new Promise<void>((resolve, reject) => {
      const request = store.put(snapshot, SNAPSHOT_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

export async function replaceSnapshot(snapshot: AppSnapshot): Promise<void> {
  await saveSnapshot(snapshot);
}

export function createExportPayload(snapshot: AppSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

export function parseImportPayload(raw: string): AppSnapshot {
  const parsed = JSON.parse(raw) as AppSnapshot;
  if (!Array.isArray(parsed.profiles) || !Array.isArray(parsed.sessions) || !parsed.settings?.selectedProfileId) {
    throw new Error('Invalid backup payload');
  }
  return parsed;
}
