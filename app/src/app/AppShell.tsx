import type { ComponentChildren } from 'preact';
import { useLocation } from 'preact-iso';
import { useAppState } from '../application/session/AppStateContext';
import { AppNav } from '../ui/components/AppNav';
import { buildTabItems } from '../ui/view-models/navigation';

type AppShellProps = {
  children: ComponentChildren;
};

export function AppShell({ children }: AppShellProps) {
  const { url } = useLocation();
  const { canOpenDevices, canOpenHistory } = useAppState();
  const tabItems = buildTabItems(canOpenDevices, canOpenHistory);

  return (
    <div class="mx-auto flex min-h-screen max-w-screen-md flex-col bg-app-canvas text-app-ink">
      <header class="hidden items-center justify-between border-b border-app-line px-6 py-4 md:flex">
        <div>
          <p class="text-xs uppercase tracking-[0.28em] text-app-muted">HIIT Master</p>
          <h1 class="font-display text-2xl">Training Session</h1>
        </div>
        <AppNav currentPath={url} items={tabItems} variant="desktop" />
      </header>

      <main class="flex-1 px-4 pb-24 pt-safe-top md:px-6 md:py-6">{children}</main>

      <AppNav currentPath={url} items={tabItems} variant="mobile" />
    </div>
  );
}
