import type { ComponentChildren, JSX } from 'preact';

type RoundedPanelPadding = 'none' | 'sm' | 'md' | 'lg';
type RoundedPanelRadius = 'md' | 'lg' | 'xl';

interface RoundedPanelProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'children'> {
  children: ComponentChildren;
  padding?: RoundedPanelPadding;
  radius?: RoundedPanelRadius;
}

const paddingClasses: Record<RoundedPanelPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

const radiusClasses: Record<RoundedPanelRadius, string> = {
  md: 'rounded-[1.4rem]',
  lg: 'rounded-[1.6rem]',
  xl: 'rounded-[1.8rem]',
};

export function RoundedPanel({
  children,
  padding = 'md',
  radius = 'lg',
  class: className = '',
  ...panelProps
}: RoundedPanelProps) {
  return (
    <div
      {...panelProps}
      class={`${radiusClasses[radius]} border border-[color:var(--line)] bg-[color:var(--panel)] ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
