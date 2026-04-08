import { useEffect, useRef } from 'preact/hooks';

interface WheelPickerProps {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}

export function WheelPicker({ value, min, max, onChange }: WheelPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const values = Array.from({ length: max - min + 1 }, (_, index) => min + index);

  useEffect(() => {
    const selected = containerRef.current?.querySelector<HTMLButtonElement>(`[data-value="${value}"]`);
    selected?.scrollIntoView({ block: 'center' });
  }, [value]);

  return (
    <div class="relative mx-auto h-44 w-28 overflow-hidden rounded-[1.6rem] border border-[color:var(--line)] bg-[color:var(--panel)]">
      <div class="pointer-events-none absolute inset-x-2 top-1/2 h-12 -translate-y-1/2 rounded-xl border border-[color:var(--line)] bg-white/25" />
      <div ref={containerRef} class="h-full snap-y overflow-y-auto py-16">
        {values.map((item) => (
          <button
            key={item}
            data-value={item}
            type="button"
            onClick={() => onChange(item)}
            class={`block h-12 w-full snap-center text-center text-2xl font-semibold ${item === value ? 'text-[color:var(--ink)]' : 'text-[color:var(--muted)]'}`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

