import { useEffect, useRef } from 'preact/hooks';

interface WheelPickerProps {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  labels?: string[];
}

const ITEM_HEIGHT_PX = 48;

export function WheelPicker({ value, min, max, onChange, labels }: WheelPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const skipAutoCenterRef = useRef(false);
  const isAutoCenteringRef = useRef(false);
  const hasUserScrollIntentRef = useRef(false);
  const values = Array.from({ length: max - min + 1 }, (_, index) => min + index);
  const hasLabels = labels !== undefined;

  useEffect(() => {
    if (skipAutoCenterRef.current) {
      skipAutoCenterRef.current = false;
      return;
    }

    const selected = containerRef.current?.querySelector<HTMLButtonElement>(`[data-value="${value}"]`);
    if (!selected) {
      return;
    }

    isAutoCenteringRef.current = true;
    hasUserScrollIntentRef.current = false;
    selected.scrollIntoView({ block: 'center' });
    window.requestAnimationFrame(() => {
      isAutoCenteringRef.current = false;
    });
  }, [value]);

  useEffect(
    () => () => {
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
    },
    []
  );

  const commitValue = (next: number, source: 'click' | 'scroll') => {
    if (next === value) {
      return;
    }

    if (source === 'scroll') {
      skipAutoCenterRef.current = true;
    }

    onChange(next);
  };

  const updateValueFromScroll = () => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const nextIndex = Math.max(0, Math.min(values.length - 1, Math.round(container.scrollTop / ITEM_HEIGHT_PX)));
    const nextValue = values[nextIndex];
    if (nextValue === undefined) {
      return;
    }

    commitValue(nextValue, 'scroll');
  };

  const handleScroll = () => {
    if (isAutoCenteringRef.current || !hasUserScrollIntentRef.current) {
      return;
    }

    if (scrollFrameRef.current !== null) {
      return;
    }

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      updateValueFromScroll();
    });
  };

  const markUserScrollIntent = () => {
    hasUserScrollIntentRef.current = true;
  };

  return (
    <div class={`relative mx-auto h-44 overflow-hidden rounded-[1.6rem] border border-[color:var(--line)] bg-[color:var(--panel)] ${hasLabels ? 'w-56' : 'w-28'}`}>
      <div class="pointer-events-none absolute inset-x-2 top-1/2 h-12 -translate-y-1/2 rounded-xl border border-[color:var(--line)] bg-white/25" />
      <div
        ref={containerRef}
        data-testid="wheel-picker-scroll"
        onScroll={handleScroll}
        onWheel={markUserScrollIntent}
        onPointerDown={markUserScrollIntent}
        onTouchStart={markUserScrollIntent}
        onKeyDown={markUserScrollIntent}
        class="h-full snap-y overflow-y-auto py-16"
      >
        {values.map((item) => {
          const label = labels?.[item - min] ?? String(item);

          return (
            <button
              key={item}
              data-value={item}
              type="button"
              onClick={() => commitValue(item, 'click')}
              class={`block h-12 w-full snap-center truncate px-3 text-center font-semibold ${hasLabels ? 'text-lg' : 'text-2xl'} ${item === value ? 'text-[color:var(--ink)]' : 'text-[color:var(--muted)]'}`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
