import { useLocation } from 'preact-iso';
import { appStore } from '../../application/store';

export function TabBar() {
  const { route } = useLocation();

  function navigate(path: string, enabled: boolean) {
    if (!enabled) {
      return;
    }
    appStore.setRoute(path);
    route(path);
  }

  const tabs = [
    { label: 'Home', path: '/', enabled: true },
    { label: 'Devices', path: '/devices', enabled: appStore.canOpenDevices.value },
    { label: 'History', path: '/history', enabled: appStore.canOpenHistory.value },
    { label: 'Settings', path: '/settings', enabled: appStore.canOpenSettings.value }
  ];

  return (
    <>
      <nav class="hidden items-center gap-2 md:flex">
        {tabs.map((tab) => (
          <button
            key={tab.path}
            type="button"
            onClick={() => navigate(tab.path, tab.enabled)}
            disabled={!tab.enabled}
            class={`rounded-full px-4 py-2 text-sm font-semibold ${
              appStore.activeRoute.value === tab.path
                ? 'bg-[color:var(--accent)] text-[color:var(--accent-ink)]'
                : 'border border-[color:var(--line)] bg-[color:var(--panel)] text-[color:var(--ink)] disabled:text-[color:var(--muted)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <nav class="mx-auto grid w-full max-w-screen-sm grid-cols-4 md:hidden">
        {tabs.map((tab) => {
          const active = appStore.activeRoute.value === tab.path;
          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => navigate(tab.path, tab.enabled)}
              disabled={!tab.enabled}
              class={`flex min-h-[3.75rem] items-center justify-center border-t-2 px-2 pb-3 pt-2 text-sm font-semibold ${
                active
                  ? 'border-t-[color:var(--accent)] text-[color:var(--accent)]'
                  : 'border-t-transparent text-[color:var(--ink)] disabled:text-[color:var(--muted)]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </>
  );
}
