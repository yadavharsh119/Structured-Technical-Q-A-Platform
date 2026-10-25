import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';

export function ResetPasswordPage() {
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

          <p className="text-sm font-medium text-muted">Security</p>
          <h1
            id="reset-heading"
            className="mt-2 font-serif text-[30px] leading-[1.2] text-ink md:text-[36px]"
          >
            Reset your password
          </h1>
          <p className="mt-4 text-sm text-body" data-testid="reset-unavailable">
            Password reset is not available yet. Please contact support if you need help accessing
            your account.
          </p>
        </div>
      </section>
    </PageShell>
  );
}

export default ResetPasswordPage;
