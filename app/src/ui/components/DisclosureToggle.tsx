import type { ComponentChildren } from 'preact';

interface DisclosureToggleProps {
  open: boolean;
  children: ComponentChildren;
  label: string;
  controls?: string;
  onToggle: () => void;
  class?: string;
  shape?: 'pill' | 'panel';
  caretAlign?: 'center' | 'start';
  chrome?: 'default' | 'plain';
  caretPlacement?: 'inline' | 'edge';
  testId?: string;
}

export function DisclosureToggle({
  open,
  children,
  label,
  controls,
  onToggle,
  class: className = '',
  shape = 'pill',
  caretAlign = 'center',
  chrome = 'default',
  caretPlacement = 'inline',
  testId
}: DisclosureToggleProps) {
  const shapeClass = shape === 'panel' ? 'rounded-[1.8rem]' : 'rounded-full';
  const alignmentClass = shape === 'panel' ? 'items-stretch' : 'items-center';
  const contentClass = shape === 'panel' ? 'flex min-w-0 flex-1 self-stretch' : 'min-w-0 flex-1';
  const caretAlignmentClass = caretAlign === 'start' ? 'self-start' : 'self-center';
  const chromeClass = chrome === 'plain'
    ? 'relative border-transparent bg-transparent p-0 font-inherit text-inherit uppercase tracking-inherit'
    : `border-[color:var(--line)] bg-[color:var(--panel)] px-4 py-3 ${shapeClass}`;
  const widthClass = caretPlacement === 'edge' ? 'w-full' : 'w-auto';
  const justificationClass = caretPlacement === 'edge' ? 'justify-center' : 'justify-between';
  const edgeCaretClass = caretPlacement === 'edge' ? 'absolute right-0 top-1/2 -translate-y-1/2' : caretAlignmentClass;

  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={open}
      aria-controls={controls}
      data-testid={testId}
      onClick={onToggle}
      class={`flex ${widthClass} ${justificationClass} gap-3 border text-left ${alignmentClass} ${chromeClass} ${className}`}
    >
      <span class={contentClass}>{children}</span>
      <span
        aria-hidden="true"
        class={`inline-flex h-6 w-6 shrink-0 ${edgeCaretClass} items-center justify-center text-[color:var(--ink)] transition-transform duration-[250ms] ease-out`}
        data-state={open ? 'open' : 'closed'}
        data-testid="disclosure-caret"
        style={{ transform: `${caretPlacement === 'edge' ? 'translateY(-50%) ' : ''}${open ? 'rotate(90deg)' : 'rotate(0deg)'}` }}
      >
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </span>
    </button>
  );
}
