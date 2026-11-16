import {
  AppSettings,
  LearningSnapshot,
  MatchRecord,
  RoundRecord,
  TournamentRecord,
} from '../types/game';
import { createInitialLearningSnapshot } from '../engine/aiLearningManager';

const DB_NAME = 'tactile-oracle-db';
const DB_VERSION = 1;

const STORES = {
  ROUNDS: 'rounds',
  MATCHES: 'matches',
  TOURNAMENTS: 'tournaments',
  LEARNING: 'learning_state',
  SETTINGS: 'settings',
} as const;

export const DEFAULT_SETTINGS: AppSettings = {
  cameraId: '',
  cameraQuality: 'balanced',
  inferenceBackend: 'auto',
  difficulty: 'normal',
  masterVolume: 0.75,
  sfxVolume: 0.85,
  ambienceVolume: 0.35,
  soundEnabled: true,
  ambienceEnabled: false,
  reducedMotion: false,
  privacyAcknowledged: false,
  tutorialCompleted: false,
  inputMode: 'webcam',
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.ROUNDS)) {
        const roundStore = db.createObjectStore(STORES.ROUNDS, { keyPath: 'id' });
        roundStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.MATCHES)) {
        const matchStore = db.createObjectStore(STORES.MATCHES, { keyPath: 'id' });
        matchStore.createIndex('endedAt', 'endedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.TOURNAMENTS)) {
        db.createObjectStore(STORES.TOURNAMENTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.LEARNING)) {
        db.createObjectStore(STORES.LEARNING, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export class LocalPersistenceManager {
  public async loadAll(): Promise<{
    rounds: RoundRecord[];
    matches: MatchRecord[];
    tournaments: TournamentRecord[];
    learning: LearningSnapshot;
    settings: AppSettings;
  }> {
    try {
      const [rounds, matches, tournaments, learningWrap, settingsWrap] = await Promise.all([
        withStore<RoundRecord[]>(STORES.ROUNDS, 'readonly', (s) => s.getAll()),
        withStore<MatchRecord[]>(STORES.MATCHES, 'readonly', (s) => s.getAll()),
        withStore<TournamentRecord[]>(STORES.TOURNAMENTS, 'readonly', (s) => s.getAll()),
        withStore<{ key: string; value: LearningSnapshot } | undefined>(
          STORES.LEARNING,
          'readonly',
          (s) => s.get('current')
        ),
        withStore<{ key: string; value: AppSettings } | undefined>(
          STORES.SETTINGS,
          'readonly',
          (s) => s.get('current')
        ),
      ]);

      rounds.sort((a, b) => a.timestamp - b.timestamp);
      matches.sort((a, b) => b.endedAt - a.endedAt);
      tournaments.sort((a, b) => b.completedAt - a.completedAt);

      return {
        rounds,
        matches,
        tournaments,
        learning: learningWrap?.value ?? createInitialLearningSnapshot(),
        settings: { ...DEFAULT_SETTINGS, ...(settingsWrap?.value ?? {}) },
      };
    } catch {
      return {
        rounds: [],
        matches: [],
        tournaments: [],
        learning: createInitialLearningSnapshot(),
        settings: { ...DEFAULT_SETTINGS },
      };
    }
  }

  public async saveRound(round: RoundRecord): Promise<void> {
    try {
      await withStore(STORES.ROUNDS, 'readwrite', (s) => s.put(round));
    } catch {
      // ignore if IndexedDB blocked in private mode
    }
  }

  public async saveMatch(match: MatchRecord): Promise<void> {
    try {
      await withStore(STORES.MATCHES, 'readwrite', (s) => s.put(match));
    } catch {
      // ignore
    }
  }

  public async saveTournament(record: TournamentRecord): Promise<void> {
    try {
      await withStore(STORES.TOURNAMENTS, 'readwrite', (s) => s.put(record));
    } catch {
      // ignore
    }
  }

  public async saveLearningSnapshot(snapshot: LearningSnapshot): Promise<void> {
    try {
      await withStore(STORES.LEARNING, 'readwrite', (s) =>
        s.put({ key: 'current', value: snapshot })
      );
    } catch {
      // ignore
    }
  }

  public async saveSettings(settings: AppSettings): Promise<void> {
    try {
      await withStore(STORES.SETTINGS, 'readwrite', (s) =>
        s.put({ key: 'current', value: settings })
      );
    } catch {
      // ignore
    }
  }

  public async resetLearningOnly(): Promise<void> {
    try {
      await withStore(STORES.ROUNDS, 'readwrite', (s) => s.clear());
      await withStore(STORES.LEARNING, 'readwrite', (s) =>
        s.put({ key: 'current', value: createInitialLearningSnapshot() })
      );
    } catch {
      // ignore
    }
  }

  public async clearAllHistoryAndLearning(): Promise<void> {
    try {
      await Promise.all([
        withStore(STORES.ROUNDS, 'readwrite', (s) => s.clear()),
        withStore(STORES.MATCHES, 'readwrite', (s) => s.clear()),
        withStore(STORES.TOURNAMENTS, 'readwrite', (s) => s.clear()),
        withStore(STORES.LEARNING, 'readwrite', (s) =>
          s.put({ key: 'current', value: createInitialLearningSnapshot() })
        ),
      ]);
    } catch {
      // ignore
    }
  }
}

export const localPersistence = new LocalPersistenceManager();
