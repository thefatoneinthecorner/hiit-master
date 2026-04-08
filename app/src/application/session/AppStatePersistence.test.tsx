import { render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { savePersistedAppState } from '../../infrastructure/storage/appStorage';
import { AppStateProvider } from './AppStateContext';
import { SettingsScreen } from '../../ui/screens/SettingsScreen';

describe('AppStateProvider persistence', () => {
  it('hydrates profiles and sessions from IndexedDB on startup', async () => {
    await savePersistedAppState({
      profiles: [
        {
          id: 'profile-bike',
          name: 'Bike',
          workDurationSec: 25,
          nominalPeakHeartrate: 172,
          warmupSec: 80,
          baseRestsSec: [45, 35],
          cooldownBaseSec: 70,
          notes: 'Stored in IndexedDB',
        },
      ],
      selectedProfileId: 'profile-bike',
      sessions: [
        {
          id: 'session-1',
          startedAt: '2026-04-07T19:00:00.000Z',
          profileId: 'profile-bike',
          profileName: 'Bike',
          profileSnapshot: {
            id: 'profile-bike',
            name: 'Bike',
            workDurationSec: 25,
            nominalPeakHeartrate: 172,
            warmupSec: 80,
            baseRestsSec: [45, 35],
            cooldownBaseSec: 70,
            notes: 'Stored in IndexedDB',
          },
          actualWorkDurationSec: 18,
          nominalWorkDurationSec: 25,
          status: 'completed',
          isCompromised: false,
          heartRateCoverageComplete: true,
          samples: [{ elapsedSec: 0, bpm: 96 }],
        },
      ],
    });

    render(
      <AppStateProvider persistenceEnabled>
        <SettingsScreen />
      </AppStateProvider>,
    );

    expect(await screen.findByDisplayValue('Bike')).toBeTruthy();
    expect(screen.getByDisplayValue('Stored in IndexedDB')).toBeTruthy();
  });
});
