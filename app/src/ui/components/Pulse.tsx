interface PulseProps {
  active?: boolean;
  beating?: boolean;
  label?: string;
  class?: string;
}

export function Pulse({ active = false, beating = active, label, class: className = '' }: PulseProps) {
  return (
    <span
      class={`${beating ? 'pulse-heart' : ''} ${active ? 'text-[color:var(--danger)]' : 'text-[color:var(--muted)]'} ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
    >
      ♥
    </span>
  );
}
