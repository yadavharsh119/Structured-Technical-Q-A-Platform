import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loginSchema } from '@structured-qa/shared';
import { useAuth } from '../context/AuthContext';
import { fieldErrorsFromIssues } from '../lib/fieldErrors';

const INPUT_CLASS =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600';

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Invalid email/username or password.',
  EMAIL_NOT_VERIFIED: 'Please verify your email before logging in. Check your inbox for the verification link.',
  ACCOUNT_LOCKED: 'Your account is temporarily locked due to failed sign-in attempts. Try again in a few minutes.',
  RATE_LIMITED: 'Too many login attempts. Please wait a few minutes and try again.',
};

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const parsed = loginSchema.safeParse({ identifier, password });
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromIssues(parsed.error.issues));
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    const response = await login(parsed.data);
    setSubmitting(false);
    if (response.success) {
      navigate(from ?? '/', { replace: true });
    } else {
      setFormError(ERROR_MESSAGES[response.error.code] ?? response.error.message);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Log in</h1>
        <p className="mt-1 text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <Link to="/register" data-testid="link-login-register" className="text-primary-700 hover:underline">
            Register
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="login-identifier" className="mb-1 block text-sm font-medium text-slate-700">
              Email or username
            </label>
            <input
              id="login-identifier"
              type="text"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              data-testid="input-login-identifier"
              className={INPUT_CLASS}
            />
            {fieldErrors.identifier && (
              <p className="mt-1 text-xs text-rose-600" data-testid="error-login-identifier">
                {fieldErrors.identifier}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              data-testid="input-login-password"
              className={INPUT_CLASS}
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-rose-600" data-testid="error-login-password">
                {fieldErrors.password}
              </p>
            )}
          </div>

          {formError && (
            <div className="rounded-md bg-rose-50 p-3 text-sm text-rose-700" data-testid="error-login">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            data-testid="button-login"
            className="w-full rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Logging in...' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  );
}
