export type NavigationVariant = 'mobile' | 'desktop';

export type NavigationItem = {
  href: string;
  label: string;
  disabled?: boolean;
};

export function buildTabItems(canOpenDevices: boolean, canOpenHistory: boolean) {
  return [
    { href: '/', label: 'Home' },
    { href: '/devices', label: 'Devices', disabled: !canOpenDevices },
    { href: '/history', label: 'History', disabled: !canOpenHistory },
    { href: '/settings', label: 'Settings' },
  ] as const satisfies readonly NavigationItem[];
}
