'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { debounce } from '@/lib/utils';
import styles from './SearchBar.module.css';

export default function SearchBar({ placeholder = 'Search questions…', onSearch, className = '' }) {
  const [value,  setValue]  = useState('');
  const [active, setActive] = useState(false);
  const router   = useRouter();
  const inputRef = useRef(null);

  const debouncedSearch = useCallback(
    debounce((q) => { if (onSearch) onSearch(q); }, 300),
    [onSearch]
  );

  const handleChange = (e) => {
    setValue(e.target.value);
    debouncedSearch(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && value.trim()) {
      router.push(`/?search=${encodeURIComponent(value.trim())}`);
    }
    if (e.key === 'Escape') {
      setValue('');
      debouncedSearch('');
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    setValue('');
    debouncedSearch('');
    inputRef.current?.focus();
  };

  // Ctrl/Cmd + K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className={[styles.searchWrap, active ? styles.active : '', className].filter(Boolean).join(' ')}>
      <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
        placeholder={placeholder}
        className={styles.input}
        aria-label="Search"
      />
      {value && (
        <button className={styles.clear} onClick={handleClear} aria-label="Clear search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      )}
      <kbd className={styles.shortcut}>⌘K</kbd>
    </div>
  );
}
