import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

type Variant = 'primary' | 'outline';
type Common = { variant?: Variant; className?: string; children: ReactNode };

export function Button({
  variant = 'primary',
  className,
  children,
  ...rest
}: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={clsx(
        'inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-medium transition-colors',
        variant === 'primary'
          ? 'bg-black text-white hover:bg-secondary'
          : 'border border-line bg-white text-ink hover:bg-tint',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  variant = 'primary',
  className,
  children,
  ...rest
}: Common & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      {...rest}
      className={clsx(
        'inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-medium transition-colors',
        variant === 'primary'
          ? 'bg-black text-white hover:bg-secondary'
          : 'border border-line bg-white text-ink hover:bg-tint',
        className,
      )}
    >
      {children}
    </a>
  );
}
