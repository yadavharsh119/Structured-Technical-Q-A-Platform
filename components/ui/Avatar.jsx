'use client';
import styles from './Avatar.module.css';
import { getInitials } from '@/lib/utils';

/**
 * Avatar component — initials-based colored avatar
 * @param {string} name        - Display name (used for initials fallback)
 * @param {string} color       - Background color
 * @param {string} initials    - Override initials
 * @param {string} size        - 'xs' | 'sm' | 'md' | 'lg' | 'xl'
 */
export default function Avatar({ name = '', color = '#6C63FF', initials, size = 'md', className = '' }) {
  const letters = initials || getInitials(name);
  return (
    <span
      className={[styles.avatar, styles[size], className].filter(Boolean).join(' ')}
      style={{ background: color }}
      aria-label={name}
      title={name}
    >
      {letters}
    </span>
  );
}
