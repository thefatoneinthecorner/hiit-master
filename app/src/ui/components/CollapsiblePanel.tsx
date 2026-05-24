import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';

interface CollapsiblePanelProps {
  open: boolean;
  children: ComponentChildren;
  class?: string;
}

export function CollapsiblePanel({ open, children, class: className = '' }: CollapsiblePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const hasMountedRef = useRef(false);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    if (open) {
      panel.removeAttribute('inert');
    } else {
      panel.setAttribute('inert', '');
    }
  }, [open]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const content = contentRef.current;
    if (!panel || !content) {
      return;
    }

    if (!hasMountedRef.current) {
      panel.style.height = open ? 'auto' : '0px';
      hasMountedRef.current = true;
      return;
    }

    const startHeight = panel.getBoundingClientRect().height;
    const endHeight = open ? content.scrollHeight : 0;
    let animationFrameId: number | null = null;

    panel.style.height = `${startHeight}px`;
    panel.style.overflow = 'hidden';

    panel.getBoundingClientRect();

    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== panel || event.propertyName !== 'height') {
        return;
      }

      if (open) {
        panel.style.height = 'auto';
      }
    };

    panel.addEventListener('transitionend', handleTransitionEnd);

    animationFrameId = window.requestAnimationFrame(() => {
      panel.style.height = `${endHeight}px`;
    });

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
      panel.removeEventListener('transitionend', handleTransitionEnd);
    };
  }, [open]);

  return (
    <div
      ref={panelRef}
      class={`overflow-hidden ${className}`}
      style={{ transition: 'height 250ms ease-out' }}
      aria-hidden={open ? undefined : 'true'}
    >
      <div ref={contentRef}>{children}</div>
    </div>
  );
}
