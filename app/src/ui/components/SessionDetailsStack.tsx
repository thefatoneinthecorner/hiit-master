import type { ComponentChildren } from 'preact';

interface SessionDetailsStackProps {
  primaryTitle: ComponentChildren;
  secondaryTitle?: ComponentChildren | null;
  secondaryContent?: ComponentChildren | null;
  children: ComponentChildren;
  class?: string;
  titleAlign?: 'center' | 'left';
}

const titleClass = 'text-sm uppercase tracking-[0.18em] text-[color:var(--muted)]';

export function SessionDetailsStack({
  primaryTitle,
  secondaryTitle = null,
  secondaryContent = null,
  children,
  class: className = '',
  titleAlign = 'center'
}: SessionDetailsStackProps) {
  const titleAlignClass = titleAlign === 'left' ? 'text-left' : 'text-center';
  const hasSecondary = secondaryTitle !== null || secondaryContent !== null;

  return (
    <div
      class={`flex min-h-48 flex-col text-center ${className}`}
      data-testid="session-details-stack"
    >
      <div class={`${titleClass} ${titleAlignClass}`} data-testid="session-details-primary-title">{primaryTitle}</div>
      <div class="flex flex-1 items-center justify-center" data-testid="session-details-primary-content">
        {children}
      </div>
      {hasSecondary ? (
        <>
          <div class={`${titleClass} ${titleAlignClass}`} data-testid="session-details-secondary-title">{secondaryTitle}</div>
          <div class="mt-1" data-testid="session-details-secondary-content">{secondaryContent}</div>
        </>
      ) : null}
    </div>
  );
}
