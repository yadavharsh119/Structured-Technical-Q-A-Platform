'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useForm } from '@/hooks/useForm';
import { validateLogin } from '@/lib/validators';
import Button from '@/components/ui/Button';
import styles from './page.module.css';

export default function LoginPage() {
  const { login, showToast } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState('');

  const { values, errors, submitting, handleChange, handleBlur, handleSubmit } = useForm(
    { email: '', password: '' },
    validateLogin
  );

  const onSubmit = handleSubmit(async (data) => {
    setServerError('');
    try {
      await login(data.email, data.password);
      showToast('Welcome back!', 'success');
      router.push('/');
    } catch (err) {
      setServerError(err.message);
    }
  });

  return (
    <div className={styles.page}>
      <div className={styles.card + ' glass-card'}>
        <div className={styles.header}>
          <Link href="/" className={styles.logo}>◈ DevPerspective</Link>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to share your perspective</p>
        </div>

        {serverError && (
          <div className={styles.serverError}>{serverError}</div>
        )}

        <form onSubmit={onSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              name="email" type="email" autoComplete="email"
              className={`form-input${errors.email ? ' error' : ''}`}
              value={values.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="you@example.com"
            />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              name="password" type="password" autoComplete="current-password"
              className={`form-input${errors.password ? ' error' : ''}`}
              value={values.password}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Your password"
            />
            {errors.password && <span className="form-error">{errors.password}</span>}
          </div>

          <Button type="submit" variant="primary" fullWidth loading={submitting}>
            Sign In
          </Button>
        </form>

        <div className={styles.divider}><span>or try a demo account</span></div>
        <div className={styles.demoAccounts}>
          {[
            { email: 'sarah@dev.com', name: 'Sarah (Senior)' },
            { email: 'tom@dev.com',   name: 'Tom (Junior)' },
          ].map(d => (
            <button key={d.email} className={styles.demoBtn}
              onClick={() => {
                login(d.email, 'Password1')
                  .then(() => { showToast(`Signed in as ${d.name}`, 'success'); router.push('/'); })
                  .catch(() => {});
              }}
            >
              {d.name}
            </button>
          ))}
        </div>

        <p className={styles.switchLink}>
          New to DevPerspective?{' '}
          <Link href="/auth/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
