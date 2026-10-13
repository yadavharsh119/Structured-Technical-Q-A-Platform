'use client';
import styles from './ToastContainer.module.css';

export default function ToastContainer({ toast }) {
  if (!toast) return null;
  return (
    <div className={styles.container}>
      <div className={`${styles.toast} ${styles[toast.type]}`}>
        <span className={styles.icon}>
          {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
        </span>
        {toast.message}
      </div>
    </div>
  );
}
