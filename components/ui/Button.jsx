'use client';
import styles from './Button.module.css';

/**
 * Button component
 * @param {string}   variant  - 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
 * @param {string}   size     - 'sm' | 'md' | 'lg'
 * @param {boolean}  loading  - shows spinner
 * @param {boolean}  fullWidth
 */
export default function Button({
  children,
  variant  = 'primary',
  size     = 'md',
  loading  = false,
  fullWidth = false,
  disabled,
  className = '',
  ...props
}) {
  return (
    <button
      className={[
        styles.btn,
        styles[variant],
        styles[size],
        fullWidth ? styles.fullWidth : '',
        loading   ? styles.loading   : '',
        className,
      ].filter(Boolean).join(' ')}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className={styles.spinner} />}
      {children}
    </button>
  );
}
