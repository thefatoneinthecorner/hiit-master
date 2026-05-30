import type { JSX } from 'preact';

export interface SliderToggleOption {
  value: string;
  label: string;
}

interface SliderToggleProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  options: [SliderToggleOption, SliderToggleOption];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function SliderToggle({
  options,
  value,
  onChange,
  label = 'Toggle option',
  class: className = '',
  ...toggleProps
}: SliderToggleProps) {
  const selectedIndex = options[1].value === value ? 1 : 0;

  return (
    <div {...toggleProps} class={`inline-block ${className}`}>
      <div
        role="group"
        aria-label={label}
        class="relative grid h-11 w-56 grid-cols-2 overflow-hidden rounded-full border border-[color:var(--line)] bg-[color:var(--panel)] p-1"
      >
        <span
          aria-hidden="true"
          class={`absolute top-1 h-9 w-[calc(50%-0.25rem)] rounded-full bg-[color:var(--accent)] transition-transform duration-200 ease-out ${
            selectedIndex === 1 ? 'translate-x-[calc(100%+0.5rem)]' : 'translate-x-0'
          }`}
        />
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              class={`relative z-10 rounded-full px-3 text-sm font-semibold transition-colors duration-150 ${
                selected ? 'bg-[color:var(--accent)] text-[color:var(--accent-ink)]' : 'text-[color:var(--muted)]'
              }`}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
