import type { JSX } from 'preact';

type IconButtonVariant = 'default' | 'danger' | 'ghost';
type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps
  extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children' | 'size'> {
  label: string;
  iconSrc: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

const sizeClasses: Record<IconButtonSize, string> = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-12 w-12'
};

const iconSizeClasses: Record<IconButtonSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6'
};

const variantClasses: Record<IconButtonVariant, string> = {
  default: 'border-[color:var(--line)] bg-[color:var(--panel)] text-[color:var(--ink)]',
  danger: 'border-[color:var(--danger)] bg-[color:var(--danger)] text-[color:var(--danger-ink)]',
  ghost: 'border-transparent bg-transparent text-[color:var(--ink)]'
};

export function IconButton({
  label,
  iconSrc,
  variant = 'default',
  size = 'md',
  type = 'button',
  class: className = '',
  ...buttonProps
}: IconButtonProps) {
  const iconStyle: JSX.CSSProperties & Record<string, string> = {
    maskImage: `url("${iconSrc}")`,
    maskPosition: 'center',
    maskRepeat: 'no-repeat',
    maskSize: 'contain',
    WebkitMaskImage: `url("${iconSrc}")`,
    WebkitMaskPosition: 'center',
    WebkitMaskRepeat: 'no-repeat',
    WebkitMaskSize: 'contain'
  };

  return (
    <button
      {...buttonProps}
      type={type}
      aria-label={label}
      class={`inline-flex shrink-0 items-center justify-center rounded-full border p-0 transition-colors duration-150 disabled:cursor-default disabled:opacity-40 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      <span aria-hidden="true" class={`${iconSizeClasses[size]} pointer-events-none block bg-current`} style={iconStyle} />
    </button>
  );
}
