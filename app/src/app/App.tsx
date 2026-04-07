import { LocationProvider, Router, Route } from 'preact-iso';
import { AppStateProvider } from '../application/session/AppStateContext';
import { AppShell } from './AppShell';
import { DevicesScreen } from '../ui/screens/DevicesScreen';
import { HistoryScreen } from '../ui/screens/HistoryScreen';
import { HomeScreen } from '../ui/screens/HomeScreen';
import { SettingsScreen } from '../ui/screens/SettingsScreen';

export function App() {
  return (
    <AppStateProvider>
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
