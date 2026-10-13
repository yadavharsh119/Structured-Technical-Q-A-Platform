'use client';
import styles from './Badge.module.css';

/**
 * Badge / Tag component
 * @param {string} variant - 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'topic'
 * @param {string} size    - 'sm' | 'md'
 */
export default function Badge({ children, variant = 'default', size = 'md', className = '', style, onClick }) {
  return (
    <span
      className={[styles.badge, styles[variant], styles[size], onClick ? styles.clickable : '', className].filter(Boolean).join(' ')}
      style={style}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      {children}
    </span>
  );
}
