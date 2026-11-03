import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, LogOut, ShieldCheck, X } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

export function SettingsPage() {
  const { user, logoutAll } = useAuth();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    const response = await logoutAll();
    setLoading(false);
    if (response.success) {
      setConfirmOpen(false);
      navigate('/login', { replace: true });
    } else {
      setError(response.error.message);
    }
  };

  return (
    <PageShell>
      <section aria-labelledby="settings-heading" className="bg-white">
        <div className="mx-auto max-w-content px-6 py-12 md:py-16">
          <p className="text-sm font-medium text-muted">Account</p>
          <h1
            id="settings-heading"
            className="mt-2 font-serif text-[30px] leading-[1.2] text-ink md:text-[40px]"
          >
            Settings
          </h1>
          <p className="mt-2 text-sm text-body">
            Signed in as <span className="font-semibold text-ink">@{user.username}</span>. Manage
            your account security here.
          </p>

          <div className="mt-8 max-w-2xl rounded-xl border border-line bg-tint/20 p-6">
            <div>
              <h2 className="text-base font-semibold text-ink">Public profile</h2>
              <p className="mt-1 text-sm text-body">
                Edit your display name, bio, skills, interests, and email visibility.
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/settings/profile"
                data-testid="link-settings-profile"
                className="inline-flex items-center justify-center rounded-lg bg-black px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-secondary"
              >
                Edit profile
              </Link>
              <Link
                to={`/users/${encodeURIComponent(user.id)}`}
                className="text-sm font-medium text-muted underline hover:text-ink"
              >
                View public profile
              </Link>
            </div>
          </div>

          <div className="mt-6 max-w-2xl rounded-xl border border-line bg-tint/20 p-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-ink" aria-hidden="true" />
              <div>
                <h2 className="text-base font-semibold text-ink">Session security</h2>
                <p className="mt-1 text-sm text-body">
                  Sign out of every browser and device where this account is logged in, including
                  this one.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setError(null);
                  setConfirmOpen(true);
                }}
                data-testid="button-settings-logout-all"
              >
                <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                Log out of all devices
              </Button>
              <Link
                to="/profile"
                className="text-sm font-medium text-muted underline hover:text-ink"
              >
                Back to profile
              </Link>
            </div>
          </div>
        </div>
      </section>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-all-title"
            data-testid="dialog-logout-all"
            className="w-full max-w-md rounded-xl border border-line bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 id="logout-all-title" className="font-serif text-lg font-bold text-ink">
                Log out of all devices?
              </h2>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg p-1 text-muted hover:bg-tint hover:text-black"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-3 text-sm text-body">
              You will be signed out of every session, including this one. You will need to log in
              again to continue.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              >
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3 border-t border-line pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmOpen(false)}
                data-testid="button-cancel-logout-all"
                className="py-2 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                data-testid="button-confirm-logout-all"
                className="py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Logging out...' : 'Log out of all devices'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

export default SettingsPage;
