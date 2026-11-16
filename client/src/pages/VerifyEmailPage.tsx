import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Mail, RefreshCw } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { resendVerificationRequest, verifyEmailRequest } from '../api/auth';
import { useAuth } from '../context/AuthContext';

const RESEND_COOLDOWN_SECONDS = 300;
const ERROR_MESSAGES: Record<string, string> = {
  INVALID_OR_EXPIRED_TOKEN: 'This verification link is invalid or has expired.',
};

type VerifyStatus = 'idle' | 'verifying' | 'success' | 'error';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const location = useLocation();
  const { user } = useAuth();
  const email = (location.state as { email?: string } | null)?.email ?? user?.email;

  const [status, setStatus] = useState<VerifyStatus>(token ? 'verifying' : 'idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (!token || ranRef.current) return;
    ranRef.current = true;
    verifyEmailRequest(token).then((response) => {
      if (response.success) {
        setStatus('success');
      } else {
        setErrorMessage(ERROR_MESSAGES[response.error.code] ?? response.error.message);
        setStatus('error');
      }
    });
  }, [token]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  const formatTimer = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleResend = async () => {
    if (!email || secondsLeft > 0 || resending) return;
    setResending(true);
    setResendNotice(null);
    setResendError(null);
    const response = await resendVerificationRequest(email);
    setResending(false);
    if (response.success) {
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
      setResendNotice(response.data.message);
    } else {
      setResendError(ERROR_MESSAGES[response.error.code] ?? response.error.message);
    }
  };

  return (
    <PageShell>
      <section aria-labelledby="verify-heading" className="bg-white">
        <div className="mx-auto max-w-md px-6 py-16 md:py-24">
          <div className="rounded-xl border border-line bg-tint/30 p-8 text-center md:p-10">
            {status === 'verifying' && (
              <>
                <Mail className="mx-auto h-12 w-12 text-ink" aria-hidden="true" />
                <h1
                  id="verify-heading"
                  className="mt-4 font-serif text-[28px] font-semibold text-ink md:text-[34px]"
                >
                  Verify your email
                </h1>
                <p className="mt-2 text-sm text-body" data-testid="verify-loading">
                  Verifying your email...
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden="true" />
                <h1
                  id="verify-heading"
                  data-testid="verify-success"
                  className="mt-4 font-serif text-[28px] font-semibold text-ink md:text-[34px]"
                >
                  Email Verified!
                </h1>
                <p className="mt-2 text-sm text-body">
                  Your email has been verified. You can now log in and start contributing.
                </p>
                <div className="mt-6">
                  <Link
                    to="/login"
                    data-testid="link-verify-login"
                    className="inline-flex items-center justify-center rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-secondary"
                  >
                    Go to login
                  </Link>
                </div>
              </>
            )}

            {status === 'error' && (
              <>
                <Mail className="mx-auto h-12 w-12 text-ink" aria-hidden="true" />
                <h1
                  id="verify-heading"
                  data-testid="verify-error"
                  className="mt-4 font-serif text-[28px] font-semibold text-ink md:text-[34px]"
                >
                  {errorMessage}
                </h1>
                <div className="mt-6">
                  <Link
                    to="/login"
                    data-testid="link-verify-login"
                    className="inline-flex items-center justify-center rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-secondary"
                  >
                    Go to login
                  </Link>
                </div>
              </>
            )}

            {status === 'idle' && (
              <>
                <Mail className="mx-auto h-12 w-12 text-ink" aria-hidden="true" />
                <h1
                  id="verify-heading"
                  className="mt-4 font-serif text-[28px] font-semibold text-ink md:text-[34px]"
                >
                  Verify your email
                </h1>
                <p className="mt-2 text-sm text-body" data-testid="verify-pending">
                  We sent a verification link to{' '}
                  <span className="font-semibold text-ink">{email ?? 'your registered email'}</span>
                  . Please check your inbox and click the link to verify your account.
                </p>

                {resendNotice && (
                  <p
                    role="status"
                    data-testid="verify-resend-success"
                    className="mt-4 text-xs font-semibold text-green-700"
                  >
                    {resendNotice}
                  </p>
                )}
                {resendError && (
                  <p
                    role="alert"
                    data-testid="error-verify-resend"
                    className="mt-4 text-xs font-semibold text-red-600"
                  >
                    {resendError}
                  </p>
                )}

                <div className="mt-8 space-y-3">
                  {email && (
                    <Button
                      type="button"
                      onClick={handleResend}
                      disabled={secondsLeft > 0 || resending}
                      data-testid="button-verify-resend"
                      variant="outline"
                      className="w-full"
                    >
                      {resending
                        ? 'Sending...'
                        : secondsLeft > 0
                          ? `Resend available in ${formatTimer(secondsLeft)}`
                          : 'Resend verification email'}
                    </Button>
                  )}

                  <div className="pt-4 border-t border-line">
                    <Link
                      to="/topics"
                      data-testid="link-verify-topics"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      Skip for now and browse topics
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

export default VerifyEmailPage;
