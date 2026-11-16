import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { resetPasswordSchema } from '@structured-qa/shared';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { resetPasswordRequest } from '../api/auth';
import { fieldErrorsFromIssues } from '../lib/fieldErrors';

const inputClass =
  'h-11 w-full rounded-lg border border-line bg-white px-3.5 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none';
const labelClass = 'block text-sm font-semibold text-ink mb-1';
const errorText = 'mt-1 text-xs font-medium text-red-600';

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_OR_EXPIRED_TOKEN: 'This reset link is invalid or has expired. Request a new one.',
};

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!success) return;
    const timeout = setTimeout(() => navigate('/login', { replace: true }), 1500);
    return () => clearTimeout(timeout);
  }, [success, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    const parsed = resetPasswordSchema.safeParse({ token: token ?? '', newPassword });
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromIssues(parsed.error.issues));
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    const response = await resetPasswordRequest(parsed.data);
    setLoading(false);
    if (response.success) {
      setSuccess(true);
    } else {
      setGeneralError(ERROR_MESSAGES[response.error.code] ?? response.error.message);
    }
  };

  return (
    <PageShell>
      <section aria-labelledby="reset-heading" className="bg-white">
        <div className="mx-auto max-w-md px-6 py-16 md:py-24">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink mb-6"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to login
          </Link>

          {!token ? (
            <div className="rounded-xl border border-line bg-tint/30 p-8 text-center">
              <KeyRound className="mx-auto h-12 w-12 text-ink" aria-hidden="true" />
              <h1
                id="reset-heading"
                data-testid="reset-invalid-link"
                className="mt-4 font-serif text-[28px] font-semibold text-ink md:text-[34px]"
              >
                This reset link is invalid
              </h1>
              <p className="mt-2 text-sm text-body">
                The link is missing a token. Request a new password reset link to continue.
              </p>
              <Link
                to="/forgot-password"
                data-testid="link-reset-forgot"
                className="mt-6 inline-flex items-center justify-center rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-secondary"
              >
                Request a new link
              </Link>
            </div>
          ) : success ? (
            <div className="rounded-xl border border-line bg-tint/30 p-8 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden="true" />
              <h1
                id="reset-heading"
                data-testid="reset-success"
                className="mt-4 font-serif text-[28px] font-semibold text-ink md:text-[34px]"
              >
                Password reset
              </h1>
              <p className="mt-2 text-sm text-body">
                Your password has been changed. We are taking you to the login page.
              </p>
              <Link
                to="/login"
                data-testid="link-reset-login"
                className="mt-6 inline-flex items-center justify-center rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-secondary"
              >
                Go to login
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-muted">Security</p>
              <h1
                id="reset-heading"
                className="mt-2 font-serif text-[30px] leading-[1.2] text-ink md:text-[36px]"
              >
                Reset your password
              </h1>
              <p className="mt-4 text-sm text-body">
                Choose a new password. For security, all other sessions will be signed out.
              </p>

              {generalError && (
                <div
                  role="alert"
                  data-testid="error-reset"
                  className="mt-6 rounded-lg bg-red-50 p-3.5 text-sm font-medium text-red-700"
                >
                  {generalError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
                <div>
                  <label htmlFor="newPassword" className={labelClass}>
                    New password
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 12 characters"
                      data-testid="input-reset-password"
                      className={`${inputClass} pr-10`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      data-testid="button-reset-toggle-password"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-muted">
                    Use at least 12 characters with uppercase, lowercase, a number, and a special
                    character.
                  </p>
                  {fieldErrors.newPassword && (
                    <p className={errorText} data-testid="error-reset-password">
                      {fieldErrors.newPassword}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className={labelClass}>
                    Confirm new password
                  </label>
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    data-testid="input-reset-confirmPassword"
                    className={inputClass}
                    required
                  />
                  {fieldErrors.confirmPassword && (
                    <p className={errorText} data-testid="error-reset-confirmPassword">
                      {fieldErrors.confirmPassword}
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    data-testid="button-reset-submit"
                    className="w-full"
                  >
                    {loading ? 'Resetting password...' : 'Reset password'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </section>
    </PageShell>
  );
}

export default ResetPasswordPage;
