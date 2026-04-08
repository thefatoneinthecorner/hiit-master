import { useLocation } from 'preact-iso';
import type { NavigationItem, NavigationVariant } from '../view-models/navigation';

type AppNavProps = {
  currentPath: string;
  items: readonly NavigationItem[];
  variant: NavigationVariant;
};

export function AppNav({ currentPath, items, variant }: AppNavProps) {
  const isMobile = variant === 'mobile';
  const { route } = useLocation();

  return (
    <nav
      aria-label="Primary"
      class={
        isMobile
          ? 'fixed inset-x-0 bottom-0 z-20 border-t border-app-line bg-app-panel/95 px-3 pb-safe-bottom pt-2 backdrop-blur md:hidden'
          : 'hidden md:block'
      }
    >
      <ul class={isMobile ? 'grid grid-cols-4 gap-2' : 'flex items-center gap-2'}>
        {items.map((item) => {
          const isActive = currentPath === item.href;
          const commonClass = isActive
            ? 'border-app-accent bg-app-accent text-app-accent-ink'
            : 'border-app-line bg-app-panel text-app-ink';

          return (
            <li key={item.href} class="list-none">
              {item.disabled ? (
                <span
                  aria-disabled="true"
                  class={`flex min-h-12 items-center justify-center rounded-2xl border px-3 text-sm font-medium opacity-45 ${commonClass}`}
                >
                  {item.label}
                </span>
              ) : (
                <a
                  href={item.href}
                  onClick={(event) => {
                    event.preventDefault();
                    route(item.href);
                  }}
                  class={`flex min-h-12 items-center justify-center rounded-2xl border px-3 text-sm font-medium transition-colors ${commonClass}`}
                >
                  {item.label}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
