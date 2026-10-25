import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { loginSchema } from '@structured-qa/shared';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { fieldErrorsFromIssues } from '../lib/fieldErrors';

const inputClass =
  'h-11 w-full rounded-lg border border-line bg-white px-3.5 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none';
const labelClass = 'block text-sm font-semibold text-ink mb-1';
const errorText = 'mt-1 text-xs font-medium text-red-600';

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Invalid email/username or password.',
  EMAIL_NOT_VERIFIED:
    'Please verify your email before logging in. Check your inbox for the verification link.',
  ACCOUNT_LOCKED:
    'Your account is temporarily locked due to failed sign-in attempts. Try again in a few minutes.',
  RATE_LIMITED: 'Too many login attempts. Please wait a few minutes and try again.',
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ identifier, password });
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromIssues(parsed.error.issues));
      return;
    }
    setFieldErrors({});
    setLoading(true);
    const response = await login(parsed.data);
    setLoading(false);
    if (response.success) {
      navigate(from ?? '/topics', { replace: true });
    } else {
      setError(ERROR_MESSAGES[response.error.code] ?? response.error.message);
    }
  };

  return (
    <PageShell>
      <section aria-labelledby="login-heading" className="bg-white">
        <div className="mx-auto max-w-md px-6 py-16 md:py-24">
          <p className="text-sm font-medium text-muted">Welcome back</p>
          <h1
            id="login-heading"
            className="mt-2 font-serif text-[30px] leading-[1.2] text-ink md:text-[36px]"
          >
            Log in to your account
          </h1>
          <p className="mt-2 text-sm text-body">
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              data-testid="link-login-register"
              className="font-semibold text-ink underline hover:text-black"
            >
              Sign up
            </Link>
          </p>

          {error && (
            <div
              role="alert"
              data-testid="error-login"
              className="mt-6 rounded-lg bg-red-50 p-3.5 text-sm font-medium text-red-700"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
            <div>
              <label htmlFor="identifier" className={labelClass}>
                Email or username
              </label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com or username"
                data-testid="input-login-identifier"
                className={inputClass}
                required
              />
              {fieldErrors.identifier && (
                <p className={errorText} data-testid="error-login-identifier">
                  {fieldErrors.identifier}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className={labelClass}>
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  data-testid="input-login-password"
                  className={`${inputClass} pr-10`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  data-testid="button-login-toggle-password"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className={errorText} data-testid="error-login-password">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={loading} data-testid="button-login" className="w-full">
                {loading ? 'Logging in...' : 'Log in'}
              </Button>
            </div>
          </form>
        </div>
      </section>
    </PageShell>
  );
}

export default LoginPage;
