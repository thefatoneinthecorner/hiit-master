import { LocationProvider, Router, Route } from 'preact-iso';
import { AppStateProvider } from '../application/session/AppStateContext';
import { createBleHeartRateMonitorAdapter } from '../infrastructure/bluetooth/heartRateMonitorAdapter';
import { createSimulatedHeartRateMonitorAdapter } from '../infrastructure/bluetooth/simulatedHeartRateMonitorAdapter';
import { AppShell } from './AppShell';
import { DevicesScreen } from '../ui/screens/DevicesScreen';
import { HistoryScreen } from '../ui/screens/HistoryScreen';
import { HomeScreen } from '../ui/screens/HomeScreen';
import { SettingsScreen } from '../ui/screens/SettingsScreen';

export function App() {
  const deviceTestMode =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('device-test') === '1';
  const monitorAdapter = deviceTestMode
    ? createSimulatedHeartRateMonitorAdapter()
    : createBleHeartRateMonitorAdapter();

  return (
    <AppStateProvider
      deviceTestMode={deviceTestMode}
      monitorAdapter={monitorAdapter}
      persistenceEnabled
    >
      <LocationProvider>
        <AppShell>
          <Router>
            <Route path="/" component={HomeScreen} />
            <Route path="/devices" component={DevicesScreen} />
            <Route path="/history" component={HistoryScreen} />
            <Route path="/settings" component={SettingsScreen} />
          </Router>
        </AppShell>
      </LocationProvider>
    </AppStateProvider>
  );
}
