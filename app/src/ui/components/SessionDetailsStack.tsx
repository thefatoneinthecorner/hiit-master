import type { ComponentChildren } from 'preact';

interface SessionDetailsStackProps {
  primaryTitle: ComponentChildren;
  secondaryTitle?: ComponentChildren;
  secondaryContent?: ComponentChildren;
  children: ComponentChildren;
  class?: string;
  titleAlign?: 'center' | 'left';
}

const titleClass = 'text-sm uppercase tracking-[0.18em] text-[color:var(--muted)]';

export function SessionDetailsStack({
  primaryTitle,
  secondaryTitle = ' ',
  secondaryContent = ' ',
  children,
  class: className = '',
  titleAlign = 'center'
}: SessionDetailsStackProps) {
  const titleAlignClass = titleAlign === 'left' ? 'text-left' : 'text-center';

  return (
    <div
      class={`flex min-h-48 flex-col text-center ${className}`}
      data-testid="session-details-stack"
    >
      <div class={`${titleClass} ${titleAlignClass}`} data-testid="session-details-primary-title">{primaryTitle}</div>
      <div class="flex flex-1 items-center justify-center" data-testid="session-details-primary-content">
        {children}
      </div>
      <div class={`${titleClass} ${titleAlignClass}`} data-testid="session-details-secondary-title">{secondaryTitle}</div>
      <div class="mt-1" data-testid="session-details-secondary-content">{secondaryContent}</div>
    </div>
  );
}
