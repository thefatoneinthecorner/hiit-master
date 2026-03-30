import type {
  AppSettingsRecord,
  HeartRateSampleRecord,
  IntervalStatRecord,
  SessionRecord
} from './types';

export const DB_NAME = 'hiit-master-rebuild';
export const DB_VERSION = 1;

export const STORE_SESSIONS = 'sessions';
export const STORE_HEART_RATE_SAMPLES = 'heartRateSamples';
export const STORE_INTERVAL_STATS = 'intervalStats';
export const STORE_APP_SETTINGS = 'appSettings';

export interface HiitMasterDatabase extends IDBDatabase {
  transaction(
    storeNames: typeof STORE_SESSIONS | typeof STORE_HEART_RATE_SAMPLES | typeof STORE_INTERVAL_STATS | typeof STORE_APP_SETTINGS | Array<string>,
    mode?: IDBTransactionMode,
    options?: IDBTransactionOptions
  ): IDBTransaction;
}

export function openDatabase(): Promise<HiitMasterDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error ?? new Error('Failed to open IndexedDB database'));
    };

    request.onupgradeneeded = () => {
      const database = request.result;

      if (database.objectStoreNames.contains(STORE_SESSIONS) === false) {
        const store = database.createObjectStore(STORE_SESSIONS, { keyPath: 'id' });
        store.createIndex('startedAt', 'startedAt', { unique: false });
        store.createIndex('comparisonEligible', 'comparisonEligible', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }

      if (database.objectStoreNames.contains(STORE_HEART_RATE_SAMPLES) === false) {
        const store = database.createObjectStore(STORE_HEART_RATE_SAMPLES, { keyPath: 'id' });
        store.createIndex('sessionId', 'sessionId', { unique: false });
        store.createIndex('sessionId_timestampMs', ['sessionId', 'timestampMs'], { unique: false });
      }

      if (database.objectStoreNames.contains(STORE_INTERVAL_STATS) === false) {
        const store = database.createObjectStore(STORE_INTERVAL_STATS, { keyPath: 'id' });
        store.createIndex('sessionId', 'sessionId', { unique: false });
        store.createIndex('sessionId_roundIndex', ['sessionId', 'roundIndex'], { unique: false });
      }

      if (database.objectStoreNames.contains(STORE_APP_SETTINGS) === false) {
        database.createObjectStore(STORE_APP_SETTINGS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result as HiitMasterDatabase);
    };
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB request failed'));
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

export class SessionRepository {
  constructor(private readonly database: HiitMasterDatabase) {}

  async save(record: SessionRecord): Promise<void> {
    const transaction = this.database.transaction(STORE_SESSIONS, 'readwrite');
    transaction.objectStore(STORE_SESSIONS).put(record);
    await transactionDone(transaction);
  }

  async getById(id: string): Promise<SessionRecord | null> {
    const transaction = this.database.transaction(STORE_SESSIONS, 'readonly');
    const result = await requestToPromise(transaction.objectStore(STORE_SESSIONS).get(id));
    await transactionDone(transaction);
    return (result as SessionRecord | undefined) ?? null;
  }

  async listAll(): Promise<SessionRecord[]> {
    const transaction = this.database.transaction(STORE_SESSIONS, 'readonly');
    const records = await requestToPromise(transaction.objectStore(STORE_SESSIONS).getAll());
    await transactionDone(transaction);

    return (records as SessionRecord[]).sort((left, right) => Date.parse(right.startedAt) - Date.parse(left.startedAt));
  }

  async getPreviousComparisonEligibleSession(currentSessionId: string): Promise<SessionRecord | null> {
    const sessions = await this.listAll();

    return sessions.find((session) => session.id !== currentSessionId && session.comparisonEligible) ?? null;
  }
}

export class HeartRateSampleRepository {
  constructor(private readonly database: HiitMasterDatabase) {}

  async append(record: HeartRateSampleRecord): Promise<void> {
    const transaction = this.database.transaction(STORE_HEART_RATE_SAMPLES, 'readwrite');
    transaction.objectStore(STORE_HEART_RATE_SAMPLES).put(record);
    await transactionDone(transaction);
  }

  async appendMany(records: HeartRateSampleRecord[]): Promise<void> {
    const transaction = this.database.transaction(STORE_HEART_RATE_SAMPLES, 'readwrite');
    const store = transaction.objectStore(STORE_HEART_RATE_SAMPLES);

    for (const record of records) {
      store.put(record);
    }

    await transactionDone(transaction);
  }

  async listBySessionId(sessionId: string): Promise<HeartRateSampleRecord[]> {
    const transaction = this.database.transaction(STORE_HEART_RATE_SAMPLES, 'readonly');
    const index = transaction.objectStore(STORE_HEART_RATE_SAMPLES).index('sessionId');
    const records = await requestToPromise(index.getAll(sessionId));
    await transactionDone(transaction);

    return (records as HeartRateSampleRecord[]).sort((left, right) => left.timestampMs - right.timestampMs);
  }
}

export class IntervalStatRepository {
  constructor(private readonly database: HiitMasterDatabase) {}

  async replaceForSession(sessionId: string, records: IntervalStatRecord[]): Promise<void> {
    const existing = await this.listBySessionId(sessionId);
    const transaction = this.database.transaction(STORE_INTERVAL_STATS, 'readwrite');
    const store = transaction.objectStore(STORE_INTERVAL_STATS);

    for (const record of existing) {
      store.delete(record.id);
    }

    for (const record of records) {
      store.put(record);
    }

    await transactionDone(transaction);
  }

  async listBySessionId(sessionId: string): Promise<IntervalStatRecord[]> {
    const transaction = this.database.transaction(STORE_INTERVAL_STATS, 'readonly');
    const index = transaction.objectStore(STORE_INTERVAL_STATS).index('sessionId');
    const records = await requestToPromise(index.getAll(sessionId));
    await transactionDone(transaction);

    return (records as IntervalStatRecord[]).sort((left, right) => left.roundIndex - right.roundIndex);
  }
}

export class AppSettingsRepository {
  constructor(private readonly database: HiitMasterDatabase) {}

  async save(record: AppSettingsRecord): Promise<void> {
    const transaction = this.database.transaction(STORE_APP_SETTINGS, 'readwrite');
    transaction.objectStore(STORE_APP_SETTINGS).put(record);
    await transactionDone(transaction);
  }

  async get(): Promise<AppSettingsRecord | null> {
    const transaction = this.database.transaction(STORE_APP_SETTINGS, 'readonly');
    const result = await requestToPromise(transaction.objectStore(STORE_APP_SETTINGS).get('app_settings'));
    await transactionDone(transaction);
    return (result as AppSettingsRecord | undefined) ?? null;
  }
}

export interface StorageRepositories {
  sessions: SessionRepository;
  heartRateSamples: HeartRateSampleRepository;
  intervalStats: IntervalStatRepository;
  appSettings: AppSettingsRepository;
}

export async function createStorageRepositories(): Promise<StorageRepositories> {
  const database = await openDatabase();

  return {
    sessions: new SessionRepository(database),
    heartRateSamples: new HeartRateSampleRepository(database),
    intervalStats: new IntervalStatRepository(database),
    appSettings: new AppSettingsRepository(database)
  };
}

export function closeDatabase(database: IDBDatabase): void {
  database.close();
}
