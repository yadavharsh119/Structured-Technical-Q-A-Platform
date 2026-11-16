import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { forgotPasswordSchema } from '@structured-qa/shared';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { forgotPasswordRequest } from '../api/auth';
import { fieldErrorsFromIssues } from '../lib/fieldErrors';

const inputClass =
  'h-11 w-full rounded-lg border border-line bg-white px-3.5 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none';
const labelClass = 'block text-sm font-semibold text-ink mb-1';
const errorText = 'mt-1 text-xs font-medium text-red-600';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromIssues(parsed.error.issues));
      return;
    }
    setFieldErrors({});
    setLoading(true);
    await forgotPasswordRequest(parsed.data);
    setLoading(false);
    // Always show the same response, whether or not the email exists.
    setSubmitted(true);
  };

  return (
    <PageShell>
      <section aria-labelledby="forgot-heading" className="bg-white">
        <div className="mx-auto max-w-md px-6 py-16 md:py-24">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink mb-6"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to login
          </Link>

          {submitted ? (
            <div className="rounded-xl border border-line bg-tint/30 p-8 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden="true" />
              <h1
                id="forgot-heading"
                data-testid="forgot-success"
                className="mt-4 font-serif text-[28px] font-semibold text-ink md:text-[34px]"
              >
                Check your email
              </h1>
              <p className="mt-2 text-sm text-body" data-testid="forgot-generic-message">
                If that email exists, we sent a link. The link expires in 30 minutes.
              </p>
              <Link
                to="/login"
                data-testid="link-forgot-login"
                className="mt-6 inline-flex items-center justify-center rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-secondary"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-muted">Account recovery</p>
              <h1
                id="forgot-heading"
                className="mt-2 font-serif text-[30px] leading-[1.2] text-ink md:text-[36px]"
              >
                Forgot your password?
              </h1>
              <p className="mt-4 text-sm text-body">
                Enter the email address for your account and we will send you a link to reset your
                password.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
                <div>
                  <label htmlFor="email" className={labelClass}>
                    Email address
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      data-testid="input-forgot-email"
                      className={`${inputClass} pl-10`}
                      required
                    />
                    <Mail
                      className="absolute left-3 top-3.5 h-4 w-4 text-muted"
                      aria-hidden="true"
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className={errorText} data-testid="error-forgot-email">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    data-testid="button-forgot-submit"
                    className="w-full"
                  >
                    {loading ? 'Sending...' : 'Send reset link'}
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

export default ForgotPasswordPage;
