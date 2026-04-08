import type { Profile, SessionRecord } from '../../domain/shared/types';

export type PersistedAppState = {
  profiles: Profile[];
  selectedProfileId: string;
  sessions: SessionRecord[];
};

const databaseName = 'hiit-master';
const databaseVersion = 1;
const storeName = 'app_state';
const stateKey = 'current';

export async function loadPersistedAppState() {
  const database = await openDatabase();

  return new Promise<PersistedAppState | null>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(stateKey);

    request.onsuccess = () => {
      resolve((request.result as PersistedAppState | undefined) ?? null);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('Failed to load persisted app state.'));
    };
    transaction.oncomplete = () => {
      database.close();
    };
  });
}

export async function savePersistedAppState(state: PersistedAppState) {
  const database = await openDatabase();

  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(state, stateKey);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      reject(request.error ?? new Error('Failed to save persisted app state.'));
    };
    transaction.oncomplete = () => {
      database.close();
    };
  });
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      reject(request.error ?? new Error('Failed to open IndexedDB.'));
    };
  });
}
