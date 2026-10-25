import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Download, Edit2, KeyRound, ShieldCheck, User, X } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { MOCK_PROFILE } from '../data/mockProfile';

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface ToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div>
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="mt-0.5 text-xs text-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-black' : 'bg-line'
        }`}
      >
        <span
          className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-line p-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-black';

export function ProfilePage() {
  const { user } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [bio, setBio] = useState(MOCK_PROFILE.bio);
  const [skills, setSkills] = useState<string[]>(MOCK_PROFILE.skills);
  const [interests, setInterests] = useState<string[]>(MOCK_PROFILE.interests);

  const [editOpen, setEditOpen] = useState(false);
  const [draftFullName, setDraftFullName] = useState('');
  const [draftBio, setDraftBio] = useState('');
  const [draftSkills, setDraftSkills] = useState('');
  const [draftInterests, setDraftInterests] = useState('');

  const [hideEmail, setHideEmail] = useState(true);
  const [showFingerprint, setShowFingerprint] = useState(true);

  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const displayName = fullName || user.username;
  const initials = getInitials(displayName);

  const openEdit = () => {
    setDraftFullName(fullName);
    setDraftBio(bio);
    setDraftSkills(skills.join(', '));
    setDraftInterests(interests.join(', '));
    setEditOpen(true);
  };

  const handleSaveProfile = () => {
    setFullName(draftFullName.trim());
    setBio(draftBio.trim());
    setSkills(
      draftSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
    setInterests(
      draftInterests
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
    setEditOpen(false);
    setSuccessBanner('Profile updated successfully.');
  };

  const handleRequestExport = () => {
    setSuccessBanner('Data export requested. You will receive an email when it is ready.');
  };

  const handleConfirmDeactivate = () => {
    setDeactivateOpen(false);
    setSuccessBanner('Account deactivated. Your personal information has been anonymised; published content remains available.');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    setPasswordError('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSuccessBanner('Password changed successfully.');
  };

  return (
    <PageShell>
      <div className="pb-28">
        {/* Header */}
        <section aria-labelledby="profile-heading" className="border-b border-line bg-white">
          <div className="mx-auto max-w-content px-6 py-12 md:py-16">
            <p className="text-sm font-medium text-muted">Profile</p>
            <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
              <div className="flex items-start gap-5">
                <span
                  aria-hidden="true"
                  className="inline-flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-black font-serif text-2xl font-bold text-white"
                >
                  {initials}
                </span>
                <div>
                  <h1
                    id="profile-heading"
                    className="font-serif text-[30px] leading-[1.2] text-ink md:text-[40px]"
                  >
                    {displayName}
                  </h1>
                  <p className="mt-1 text-sm font-medium text-secondary">@{user.username}</p>
                  {bio && <p className="mt-3 max-w-2xl text-sm text-body">{bio}</p>}
                </div>
              </div>
              <Button variant="outline" onClick={openEdit} className="py-2 text-xs">
                <Edit2 className="mr-1.5 h-4 w-4" /> Edit Profile
              </Button>
            </div>

            {(skills.length > 0 || interests.length > 0) && (
              <div className="mt-8 space-y-4">
                {skills.length > 0 && (
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                      Technical Skills
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-md border border-line bg-tint px-2.5 py-1 text-xs font-medium text-ink"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {interests.length > 0 && (
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                      Areas of Interest
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {interests.map((interest) => (
                        <span
                          key={interest}
                          className="rounded-md border border-line bg-white px-2.5 py-1 text-xs font-medium text-secondary"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Main content */}
        <section className="bg-canvas">
          <div className="mx-auto max-w-content space-y-8 px-6 py-10">
            {successBanner && (
              <div className="flex items-center justify-between rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-900 shadow-xs">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
                  <span>{successBanner}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSuccessBanner(null)}
                  className="rounded-lg p-1 text-green-700 hover:bg-green-100"
                  aria-label="Dismiss message"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Privacy settings */}
            <div className="rounded-xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-2 border-b border-line pb-3">
                <ShieldCheck className="h-5 w-5 text-ink" aria-hidden="true" />
                <h2 className="font-serif text-lg font-semibold text-ink">Privacy Settings</h2>
              </div>

              <div className="divide-y divide-line">
                <Toggle
                  label="Hide email from public"
                  description="Your email address will not be shown on your public profile."
                  checked={hideEmail}
                  onChange={setHideEmail}
                />
                <Toggle
                  label="Show Expert Fingerprint publicly"
                  description="Display your top expertise domains and upvotes on your public profile."
                  checked={showFingerprint}
                  onChange={setShowFingerprint}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
                <Button variant="outline" onClick={handleRequestExport} className="py-2 text-xs">
                  <Download className="mr-1.5 h-4 w-4" /> Request Data Export
                </Button>
                <button
                  type="button"
                  onClick={() => setDeactivateOpen(true)}
                  className="inline-flex items-center rounded-lg border border-red-300 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                >
                  Deactivate Account
                </button>
              </div>
            </div>

            {/* Change password */}
            <div className="rounded-xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-2 border-b border-line pb-3">
                <KeyRound className="h-5 w-5 text-ink" aria-hidden="true" />
                <h2 className="font-serif text-lg font-semibold text-ink">Change Password</h2>
              </div>

              <form onSubmit={handleChangePassword} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="current-password" className="mb-1 block text-xs font-semibold text-ink">
                    Current Password
                  </label>
                  <input
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="new-password" className="mb-1 block text-xs font-semibold text-ink">
                    New Password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="mb-1 block text-xs font-semibold text-ink">
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-3">
                  {passwordError && (
                    <p className="mb-2 text-xs font-medium text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {passwordError}
                    </p>
                  )}
                  <Button type="submit" className="py-2 text-xs">
                    Change Password
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* MODAL: Edit Profile */}
        {editOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-xl border border-line bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2 text-ink">
                  <User className="h-5 w-5" />
                  <h3 className="font-serif text-lg font-bold">Edit Profile</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="rounded-lg p-1 text-muted hover:bg-tint hover:text-black"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="edit-full-name" className="mb-1 block text-xs font-semibold text-ink">
                    Full Name
                  </label>
                  <input
                    id="edit-full-name"
                    type="text"
                    value={draftFullName}
                    onChange={(e) => setDraftFullName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="edit-bio" className="mb-1 block text-xs font-semibold text-ink">
                    Bio
                  </label>
                  <textarea
                    id="edit-bio"
                    rows={3}
                    value={draftBio}
                    onChange={(e) => setDraftBio(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="edit-skills" className="mb-1 block text-xs font-semibold text-ink">
                    Technical Skills (comma separated)
                  </label>
                  <input
                    id="edit-skills"
                    type="text"
                    value={draftSkills}
                    onChange={(e) => setDraftSkills(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="edit-interests" className="mb-1 block text-xs font-semibold text-ink">
                    Areas of Interest (comma separated)
                  </label>
                  <input
                    id="edit-interests"
                    type="text"
                    value={draftInterests}
                    onChange={(e) => setDraftInterests(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-line pt-3">
                <Button variant="outline" onClick={() => setEditOpen(false)} className="py-2 text-xs">
                  Cancel
                </Button>
                <Button onClick={handleSaveProfile} className="py-2 text-xs">
                  Save Profile
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Deactivate Account */}
        {deactivateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-xl border border-line bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  <h3 className="font-serif text-lg font-bold">Deactivate Account</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDeactivateOpen(false)}
                  className="rounded-lg p-1 text-muted hover:bg-tint hover:text-black"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-body">
                Deactivating your account will anonymise your personal information, including your
                name, email address, and profile details. Your published questions and perspectives
                will remain available to the community. This action cannot be undone.
              </p>

              <div className="mt-6 flex justify-end gap-3 border-t border-line pt-3">
                <Button variant="outline" onClick={() => setDeactivateOpen(false)} className="py-2 text-xs">
                  Cancel
                </Button>
                <button
                  type="button"
                  onClick={handleConfirmDeactivate}
                  className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
                >
                  Confirm Deactivation
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

export default ProfilePage;
