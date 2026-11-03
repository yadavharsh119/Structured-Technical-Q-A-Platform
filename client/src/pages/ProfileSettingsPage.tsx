import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import {
  PROFILE_BIO_MAX,
  changePasswordSchema,
  profileUpdateSchema,
} from '@structured-qa/shared';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import {
  changePassword,
  getUserProfile,
  updateFingerprintVisibility,
  updateMyProfile,
} from '../api/users';
import { fieldErrorsFromIssues } from '../lib/fieldErrors';

const inputClass =
  'h-11 w-full rounded-lg border border-line bg-white px-3.5 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none';
const labelClass = 'block text-sm font-semibold text-ink mb-1';
const errorText = 'mt-1 text-xs font-medium text-red-600';

const PROFILE_FIELD_ALIASES: Record<string, string> = {
  fullName: 'fullName',
  full_name: 'fullName',
  username: 'username',
  bio: 'bio',
  skills: 'skills',
  technicalSkills: 'skills',
  technical_skills: 'skills',
  interests: 'interests',
  areasOfInterest: 'interests',
  areas_of_interest: 'interests',
  emailPublic: 'emailPublic',
  email_public: 'emailPublic',
};

const PASSWORD_FIELD_ALIASES: Record<string, string> = {
  currentPassword: 'currentPassword',
  current_password: 'currentPassword',
  newPassword: 'newPassword',
  new_password: 'newPassword',
};

function apiValidationErrors(
  message: string,
  aliases: Record<string, string>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const part of message.split(',')) {
    const field = aliases[part.trim()];
    if (field && !errors[field]) {
      errors[field] = 'Please check this field.';
    }
  }
  return errors;
}

function parseList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function FingerprintToggle({
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

export function ProfileSettingsPage() {
  const { user, refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [interestsInput, setInterestsInput] = useState('');
  const [emailPublic, setEmailPublic] = useState(false);

  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const [fingerprintPublic, setFingerprintPublic] = useState(user?.fingerprintPublic !== false);
  const [savingFingerprint, setSavingFingerprint] = useState(false);
  const [fingerprintError, setFingerprintError] = useState<string | null>(null);
  const [fingerprintSuccess, setFingerprintSuccess] = useState<string | null>(null);

  useEffect(() => {
    setFingerprintPublic(user?.fingerprintPublic !== false);
  }, [user?.fingerprintPublic]);

  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    getUserProfile(userId).then((response) => {
      if (cancelled) return;
      if (response.success) {
        const profile = response.data.user;
        setFullName(profile.fullName);
        setUsername(profile.username);
        setBio(profile.bio ?? '');
        setSkillsInput(profile.skills.join(', '));
        setInterestsInput(profile.interests.join(', '));
        setEmailPublic(profile.emailPublic);
      } else {
        setLoadError(response.error.message);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileErrors({});
    setProfileError(null);
    setProfileSuccess(null);

    const parsed = profileUpdateSchema.safeParse({
      fullName,
      username,
      bio,
      skills: parseList(skillsInput),
      interests: parseList(interestsInput),
      emailPublic,
    });

    if (!parsed.success) {
      setProfileErrors(fieldErrorsFromIssues(parsed.error.issues));
      return;
    }

    setSavingProfile(true);
    const response = await updateMyProfile(parsed.data);
    setSavingProfile(false);

    if (!response.success) {
      if (response.error.code === 'USERNAME_TAKEN') {
        setProfileErrors({ username: response.error.message });
      } else if (response.error.code === 'VALIDATION_ERROR') {
        setProfileErrors(apiValidationErrors(response.error.message, PROFILE_FIELD_ALIASES));
      }
      setProfileError(response.error.message);
      return;
    }

    const profile = response.data.user;
    setFullName(profile.fullName);
    setUsername(profile.username);
    setBio(profile.bio ?? '');
    setSkillsInput(profile.skills.join(', '));
    setInterestsInput(profile.interests.join(', '));
    setEmailPublic(profile.emailPublic);
    await refreshUser();
    setProfileSuccess('Profile updated.');
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordErrors({});
    setPasswordError(null);
    setPasswordSuccess(null);

    const parsed = changePasswordSchema.safeParse({ currentPassword, newPassword });
    if (!parsed.success) {
      setPasswordErrors(fieldErrorsFromIssues(parsed.error.issues));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrors({ confirmPassword: 'Passwords do not match.' });
      return;
    }

    setSavingPassword(true);
    const response = await changePassword(parsed.data);
    setSavingPassword(false);

    if (!response.success) {
      if (response.error.code === 'INVALID_CURRENT_PASSWORD') {
        setPasswordErrors({ currentPassword: response.error.message });
      } else if (response.error.code === 'VALIDATION_ERROR') {
        setPasswordErrors(apiValidationErrors(response.error.message, PASSWORD_FIELD_ALIASES));
      }
      setPasswordError(response.error.message);
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordSuccess('Password changed. Your other sessions have been signed out.');
  };

  const handleFingerprintChange = async (next: boolean) => {
    if (savingFingerprint) return;
    setFingerprintError(null);
    setFingerprintSuccess(null);
    setSavingFingerprint(true);
    const response = await updateFingerprintVisibility(next);
    setSavingFingerprint(false);

    if (response.success) {
      setFingerprintPublic(response.data.fingerprintPublic);
      await refreshUser();
      setFingerprintSuccess('Fingerprint visibility updated.');
    } else {
      setFingerprintError(response.error.message);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <div
          className="mx-auto max-w-3xl px-6 py-16"
          role="status"
          aria-live="polite"
          data-testid="profile-settings-loading"
        >
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-28 rounded bg-tint" />
            <div className="h-10 w-64 rounded bg-tint" />
            <div className="mt-8 h-64 w-full rounded-xl border border-line bg-tint/30" />
          </div>
          <span className="sr-only">Loading profile settings...</span>
        </div>
      </PageShell>
    );
  }

  if (loadError) {
    return (
      <PageShell>
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div
            role="alert"
            data-testid="profile-settings-error"
            className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-800"
          >
            {loadError}
          </div>
          <Link
            to="/settings"
            className="mt-6 inline-block text-sm font-medium text-ink underline hover:text-black"
          >
            Back to settings
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="pb-28">
        <section aria-labelledby="profile-settings-heading" className="border-b border-line bg-white">
          <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
            <p className="text-sm font-medium text-muted">Settings</p>
            <h1
              id="profile-settings-heading"
              className="mt-2 font-serif text-[30px] leading-[1.2] text-ink md:text-[40px]"
            >
              Profile
            </h1>
            <p className="mt-2 text-sm text-body">
              Update how you appear on your public profile and manage your account security.
            </p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium">
              <Link to="/settings" className="text-muted underline hover:text-ink">
                Back to settings
              </Link>
              <Link
                to={`/users/${encodeURIComponent(user.id)}`}
                className="text-muted underline hover:text-ink"
              >
                View public profile
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-canvas">
          <div className="mx-auto max-w-3xl space-y-8 px-6 py-10">
            <form
              onSubmit={handleProfileSubmit}
              className="rounded-xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              noValidate
            >
              <h2 className="font-serif text-lg font-semibold text-ink">Public profile</h2>
              <p className="mt-1 text-sm text-body">
                This information appears on your public profile page.
              </p>

              {profileError && (
                <div
                  role="alert"
                  data-testid="profile-settings-profile-error"
                  className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{profileError}</span>
                </div>
              )}
              {profileSuccess && (
                <div
                  role="status"
                  data-testid="profile-settings-profile-success"
                  className="mt-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor="profile-full-name" className={labelClass}>
                    Full name
                  </label>
                  <input
                    id="profile-full-name"
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className={inputClass}
                    autoComplete="name"
                    data-testid="input-profile-fullName"
                    required
                  />
                  {profileErrors.fullName && (
                    <p className={errorText} data-testid="error-profile-fullName">
                      {profileErrors.fullName}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="profile-username" className={labelClass}>
                    Username
                  </label>
                  <input
                    id="profile-username"
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className={inputClass}
                    autoComplete="username"
                    data-testid="input-profile-username"
                    required
                  />
                  {profileErrors.username && (
                    <p className={errorText} data-testid="error-profile-username">
                      {profileErrors.username}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="profile-bio" className={labelClass}>
                    Bio
                  </label>
                  <textarea
                    id="profile-bio"
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    rows={4}
                    maxLength={PROFILE_BIO_MAX}
                    className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none"
                    placeholder="Tell people about your background and experience."
                    data-testid="input-profile-bio"
                  />
                  <div className="mt-1 flex items-start justify-between gap-3">
                    {profileErrors.bio ? (
                      <p className={errorText} data-testid="error-profile-bio">
                        {profileErrors.bio}
                      </p>
                    ) : (
                      <span className="text-xs text-muted">Optional.</span>
                    )}
                    <span className="shrink-0 text-xs text-muted">
                      {bio.length}/{PROFILE_BIO_MAX}
                    </span>
                  </div>
                </div>

                <div>
                  <label htmlFor="profile-skills" className={labelClass}>
                    Skills
                  </label>
                  <input
                    id="profile-skills"
                    type="text"
                    value={skillsInput}
                    onChange={(event) => setSkillsInput(event.target.value)}
                    className={inputClass}
                    placeholder="React, TypeScript, PostgreSQL"
                    data-testid="input-profile-skills"
                  />
                  <p className="mt-1 text-xs text-muted">
                    Separate skills with commas. Up to 10 items.
                  </p>
                  {profileErrors.skills && (
                    <p className={errorText} data-testid="error-profile-skills">
                      {profileErrors.skills}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="profile-interests" className={labelClass}>
                    Interests
                  </label>
                  <input
                    id="profile-interests"
                    type="text"
                    value={interestsInput}
                    onChange={(event) => setInterestsInput(event.target.value)}
                    className={inputClass}
                    placeholder="Distributed systems, Developer tooling"
                    data-testid="input-profile-interests"
                  />
                  <p className="mt-1 text-xs text-muted">
                    Separate interests with commas. Up to 10 items.
                  </p>
                  {profileErrors.interests && (
                    <p className={errorText} data-testid="error-profile-interests">
                      {profileErrors.interests}
                    </p>
                  )}
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-line bg-tint/30 p-3">
                  <input
                    id="profile-email-public"
                    type="checkbox"
                    checked={emailPublic}
                    onChange={(event) => setEmailPublic(event.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-black"
                    data-testid="input-profile-emailPublic"
                  />
                  <label htmlFor="profile-email-public" className="text-sm text-ink">
                    <span className="font-semibold">Show my email publicly</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      Your email is only visible on your profile when this is on.
                    </span>
                  </label>
                </div>
              </div>

              <div className="mt-6 border-t border-line pt-4">
                <Button
                  type="submit"
                  disabled={savingProfile}
                  className="py-2.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid="button-save-profile"
                >
                  {savingProfile ? 'Saving...' : 'Save profile'}
                </Button>
              </div>
            </form>

            <div className="rounded-xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-2 border-b border-line pb-3">
                <ShieldCheck className="h-5 w-5 text-ink" aria-hidden="true" />
                <h2 className="font-serif text-lg font-semibold text-ink">Fingerprint visibility</h2>
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
                <FingerprintToggle
                  checked={fingerprintPublic}
                  disabled={savingFingerprint}
                  onChange={handleFingerprintChange}
                />
              </div>
              {fingerprintError && (
                <p role="alert" className="text-xs font-medium text-red-600">
                  {fingerprintError}
                </p>
              )}
              {fingerprintSuccess && (
                <p role="status" className="text-xs font-medium text-green-700">
                  {fingerprintSuccess}
                </p>
              )}
            </div>

            <form
              onSubmit={handlePasswordSubmit}
              className="rounded-xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              noValidate
            >
              <h2 className="font-serif text-lg font-semibold text-ink">Change password</h2>
              <p className="mt-1 text-sm text-body">
                Use at least 12 characters with uppercase, lowercase, a number, and a special
                character. Other sessions will be signed out.
              </p>

              {passwordError && (
                <div
                  role="alert"
                  data-testid="profile-settings-password-error"
                  className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{passwordError}</span>
                </div>
              )}
              {passwordSuccess && (
                <div
                  role="status"
                  data-testid="profile-settings-password-success"
                  className="mt-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor="profile-current-password" className={labelClass}>
                    Current password
                  </label>
                  <input
                    id="profile-current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    className={inputClass}
                    autoComplete="current-password"
                    data-testid="input-profile-currentPassword"
                    required
                  />
                  {passwordErrors.currentPassword && (
                    <p className={errorText} data-testid="error-profile-currentPassword">
                      {passwordErrors.currentPassword}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="profile-new-password" className={labelClass}>
                    New password
                  </label>
                  <input
                    id="profile-new-password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className={inputClass}
                    autoComplete="new-password"
                    data-testid="input-profile-newPassword"
                    required
                  />
                  {passwordErrors.newPassword && (
                    <p className={errorText} data-testid="error-profile-newPassword">
                      {passwordErrors.newPassword}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="profile-confirm-password" className={labelClass}>
                    Confirm new password
                  </label>
                  <input
                    id="profile-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className={inputClass}
                    autoComplete="new-password"
                    data-testid="input-profile-confirmPassword"
                    required
                  />
                  {passwordErrors.confirmPassword && (
                    <p className={errorText} data-testid="error-profile-confirmPassword">
                      {passwordErrors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 border-t border-line pt-4">
                <Button
                  type="submit"
                  disabled={savingPassword}
                  className="py-2.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid="button-change-password"
                >
                  {savingPassword ? 'Changing password...' : 'Change password'}
                </Button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

export default ProfileSettingsPage;
