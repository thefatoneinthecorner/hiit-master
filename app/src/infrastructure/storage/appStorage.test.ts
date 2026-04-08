import { describe, expect, it } from 'vitest';
import type { PersistedAppState } from './appStorage';
import { loadPersistedAppState, savePersistedAppState } from './appStorage';

const persistedState: PersistedAppState = {
  profiles: [
    {
      id: 'profile-my-profile',
      name: 'My Profile',
      workDurationSec: 30,
      nominalPeakHeartrate: 160,
      warmupSec: 120,
      baseRestsSec: [60, 50, 40, 30],
      cooldownBaseSec: 90,
      notes: 'Starter profile',
    },
  ],
  selectedProfileId: 'profile-my-profile',
  sessions: [
    {
      id: 'session-1',
      startedAt: '2026-04-07T19:00:00.000Z',
      profileId: 'profile-my-profile',
      profileName: 'My Profile',
      profileSnapshot: {
        id: 'profile-my-profile',
        name: 'My Profile',
        workDurationSec: 30,
        nominalPeakHeartrate: 160,
        warmupSec: 120,
        baseRestsSec: [60, 50, 40, 30],
        cooldownBaseSec: 90,
        notes: 'Starter profile',
      },
      actualWorkDurationSec: 20,
      nominalWorkDurationSec: 30,
      status: 'completed',
      isCompromised: false,
      heartRateCoverageComplete: true,
      samples: [{ elapsedSec: 0, bpm: 90 }],
    },
  ],
};

describe('appStorage', () => {
  it('saves and reloads persisted app state', async () => {
    await savePersistedAppState(persistedState);

    const loaded = await loadPersistedAppState();

    expect(loaded).toEqual(persistedState);
  });
});
