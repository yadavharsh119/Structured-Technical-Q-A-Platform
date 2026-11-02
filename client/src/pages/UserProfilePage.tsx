import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Fingerprint, ShieldCheck } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { useAuth } from '../context/AuthContext';
import { meRequest } from '../api/auth';
import {
  getUserFingerprint,
  updateFingerprintVisibility,
  type FingerprintEntry,
} from '../api/users';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function VisibilityToggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Show Expert Fingerprint publicly"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
        checked ? 'bg-black' : 'bg-line'
      }`}
    >
      <span
        className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export function UserProfilePage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const location = useLocation();

  const [fingerprint, setFingerprint] = useState<FingerprintEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = user !== null && user.id === id;
  const stateUsername = (location.state as { username?: string } | null)?.username;
  const routeUsername = UUID_RE.test(id) ? null : id;
  const username = isOwnProfile ? user.username : stateUsername ?? routeUsername;

  const [isPublic, setIsPublic] = useState(user?.fingerprintPublic !== false);
  const [isSavingVisibility, setIsSavingVisibility] = useState(false);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id !== id) return;
    setIsPublic(user.fingerprintPublic !== false);

    let cancelled = false;
    meRequest().then((response) => {
      if (cancelled || !response.success) return;
      setIsPublic(response.data.user.fingerprintPublic !== false);
    });

    return () => {
      cancelled = true;
    };
  }, [id, user?.id, user?.fingerprintPublic]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setIsPrivate(false);
    setError(null);
    setFingerprint([]);

    getUserFingerprint(id).then((response) => {
      if (cancelled) return;
      if (response.success) {
        setFingerprint(response.data.fingerprint);
      } else if (response.error.code === 'FINGERPRINT_NOT_FOUND') {
        setIsPrivate(true);
      } else {
        setError(response.error.message);
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleVisibilityChange = async (next: boolean) => {
    if (isSavingVisibility) return;
    setVisibilityError(null);
    setIsSavingVisibility(true);
    const response = await updateFingerprintVisibility(next);
    setIsSavingVisibility(false);

    if (response.success) {
      setIsPublic(response.data.fingerprintPublic);
    } else {
      setVisibilityError(response.error.message);
    }
  };

  if (isLoading) {
    return (
      <PageShell>
        <div
          className="mx-auto max-w-content px-6 py-16 md:py-24"
          role="status"
          aria-live="polite"
          data-testid="user-profile-loading"
        >
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-28 rounded bg-tint" />
            <div className="h-10 w-52 rounded bg-tint" />
            <div className="mt-8 h-24 w-full max-w-xl rounded-xl border border-line bg-tint/30" />
          </div>
          <span className="sr-only">Loading profile...</span>
        </div>
      </PageShell>
    );
  }

  if (isPrivate) {
    return (
      <PageShell>
        <section aria-labelledby="private-profile-heading" className="bg-white">
          <div className="mx-auto max-w-content px-6 py-16 text-center md:py-24">
            <Fingerprint className="mx-auto h-8 w-8 text-deco" aria-hidden="true" />
            <h1
              id="private-profile-heading"
              className="mt-3 font-serif text-[30px] leading-[1.2] text-ink md:text-[40px]"
            >
              This profile is private
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-body">
              This user has chosen to keep their Expert Fingerprint hidden.
            </p>
          </div>
        </section>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <div className="mx-auto max-w-content px-6 py-16 md:py-24">
          <div
            role="alert"
            data-testid="user-profile-error"
            className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-800"
          >
            {error}
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="pb-28">
        <section aria-labelledby="user-profile-heading" className="border-b border-line bg-white">
          <div className="mx-auto max-w-content px-6 py-12 md:py-16">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-muted">
              <Fingerprint className="h-4 w-4" aria-hidden="true" />
              Expert Fingerprint
            </p>
            <h1
              id="user-profile-heading"
              className="mt-3 font-serif text-[30px] leading-[1.2] text-ink md:text-[40px]"
            >
              {username ? `@${username}` : 'Member profile'}
            </h1>
          </div>
        </section>

        <section className="bg-canvas">
          <div className="mx-auto max-w-content space-y-8 px-6 py-10">
            <div className="rounded-xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <h2 className="font-serif text-lg font-semibold text-ink">Top expertise</h2>
              {fingerprint.length === 0 ? (
                <p className="mt-4 text-sm text-body">No expertise yet.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {fingerprint.slice(0, 3).map((entry) => (
                    <li
                      key={entry.category}
                      className="text-sm font-medium text-ink"
                      data-testid="fingerprint-entry"
                    >
                      {entry.category}, {entry.perspectives} perspectives, {entry.upvotes} upvotes
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {isOwnProfile && (
              <div className="rounded-xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-2 border-b border-line pb-3">
                  <ShieldCheck className="h-5 w-5 text-ink" aria-hidden="true" />
                  <h2 className="font-serif text-lg font-semibold text-ink">Privacy</h2>
                </div>
                <div className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      Show Expert Fingerprint publicly
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      When off, only you can see your expertise.
                    </p>
                  </div>
                  <VisibilityToggle
                    checked={isPublic}
                    disabled={isSavingVisibility}
                    onChange={handleVisibilityChange}
                  />
                </div>
                {visibilityError && (
                  <p role="alert" className="text-xs font-medium text-red-600">
                    {visibilityError}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}

export default UserProfilePage;
