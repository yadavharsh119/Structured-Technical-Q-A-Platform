import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmailRequest } from '../api/auth';

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_OR_EXPIRED_TOKEN: 'This verification link is invalid or has expired.',
};

type VerifyStatus = 'verifying' | 'success' | 'error';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<VerifyStatus>(token ? 'verifying' : 'error');
  const [errorMessage, setErrorMessage] = useState(
    token ? '' : 'No verification token was provided.',
  );
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

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        {status === 'verifying' && (
          <p className="text-sm text-slate-500" data-testid="verify-loading">
            Verifying your email...
          </p>
        )}
        {status === 'success' && (
          <>
            <h1 className="text-lg font-semibold text-emerald-700" data-testid="verify-success">
              Email verified successfully. You can now log in.
            </h1>
            <Link
              to="/login"
              data-testid="link-verify-login"
              className="mt-4 inline-block text-sm font-medium text-primary-700 hover:underline"
            >
              Go to login
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-lg font-semibold text-rose-700" data-testid="verify-error">
              {errorMessage}
            </h1>
            <Link
              to="/login"
              data-testid="link-verify-login"
              className="mt-4 inline-block text-sm font-medium text-primary-700 hover:underline"
            >
              Go to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
