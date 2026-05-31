import { useEffect } from 'preact/hooks';
import { LocationProvider, Route, Router, useLocation } from 'preact-iso';
import { appStore } from '../application/store';
import { TabBar } from '../ui/components/TabBar';
import { BPMSettingsScreen } from '../ui/screens/BPMSettingsScreen';
import { DevicesScreen } from '../ui/screens/DevicesScreen';
import { HomeScreen } from '../ui/screens/HomeScreen';
import { SettingsScreen } from '../ui/screens/SettingsScreen';
import { TrendScreen } from '../ui/screens/TrendScreen';

function SettingsRoute() {
  return appStore.settingsMode.value === 'bpm' ? <BPMSettingsScreen /> : <SettingsScreen />;
}

function Shell() {
  const location = useLocation();

  useEffect(() => {
    void appStore.initialize().then(() => {
      appStore.beginEditingProfile(appStore.selectedProfile.value.id);
      appStore.setRoute(location.path);
      if (location.path === '/devices' && !appStore.canOpenDevices.value) {
        location.route('/');
      }
      if (location.path === '/trend' && !appStore.canOpenTrend.value) {
        location.route('/');
      }
      if (location.path === '/settings' && !appStore.canOpenSettings.value) {
        location.route('/');
      }
    });
  }, []);

  useEffect(() => {
    appStore.setRoute(location.path);
  }, [location.path]);

  if (!appStore.initialized.value) {
    return <div class="safe-shell"> </div>;
  }

  return (
    <div class="safe-shell flex h-[100dvh] flex-col gap-4 overflow-hidden">
      <header class="hidden md:flex md:justify-end">
        <TabBar />
      </header>
      <main class="app-main min-h-0 flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <div class="min-h-0 flex flex-1 flex-col">
          <Router>
            <Route path="/" component={HomeScreen} />
            <Route path="/devices" component={DevicesScreen} />
            <Route path="/trend" component={TrendScreen} />
            <Route path="/settings" component={SettingsRoute} />
          </Router>
        </div>
      </main>
      <div class="mobile-action-bar fixed inset-x-0 bottom-0 z-20 md:hidden">
        <TabBar />
      </div>
    </div>
  );
}

export function App() {
  return (
    <LocationProvider>
      <Shell />
    </LocationProvider>
  );
}
