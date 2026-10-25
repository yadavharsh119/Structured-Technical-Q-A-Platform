import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { registerSchema } from '@structured-qa/shared';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { fieldErrorsFromIssues } from '../lib/fieldErrors';

const inputClass =
  'h-11 w-full rounded-lg border border-line bg-white px-3.5 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none';
const labelClass = 'block text-sm font-semibold text-ink mb-1';
const errorText = 'mt-1 text-xs font-medium text-red-600';

interface RuleCheckProps {
  passed: boolean;
  label: string;
}

function RuleCheck({ passed, label }: RuleCheckProps) {
  return (
    <li className={`flex items-center gap-1.5 text-xs ${passed ? 'text-green-700' : 'text-muted'}`}>
      {passed ? (
        <Check className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-deco ml-1 mr-1" aria-hidden="true" />
      )}
      <span>{label}</span>
    </li>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const ruleLength = password.length >= 12;
  const ruleUpper = /[A-Z]/.test(password);
  const ruleLower = /[a-z]/.test(password);
  const ruleDigit = /[0-9]/.test(password);
  const ruleSpecial = /[^A-Za-z0-9]/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    const result = registerSchema.safeParse({
      fullName: fullName.trim(),
      username: username.trim(),
      email: email.trim(),
      password,
      confirmPassword,
    });

    if (!result.success) {
      setFieldErrors(fieldErrorsFromIssues(result.error.issues));
      return;
    }

    setLoading(true);
    const response = await register(result.data);
    setLoading(false);
    if (response.success) {
      setSucceeded(true);
    } else {
      setGeneralError(response.error.message);
    }
  };

  if (succeeded) {
    return (
      <PageShell>
        <section aria-labelledby="register-success-heading" className="bg-white">
          <div className="mx-auto max-w-md px-6 py-16 md:py-24">
            <div className="rounded-xl border border-line bg-tint/30 p-8 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden="true" />
              <h1
                id="register-success-heading"
                data-testid="register-success"
                className="mt-4 font-serif text-[28px] font-semibold text-ink md:text-[34px]"
              >
                Check your email to verify your account.
              </h1>
              <p className="mt-2 text-sm text-body">
                We sent a verification link to the email address you provided.
              </p>
              <Link
                to="/login"
                data-testid="link-register-login"
                className="mt-6 inline-flex items-center justify-center rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-secondary"
              >
                Go to login
              </Link>
            </div>
          </div>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section aria-labelledby="register-heading" className="bg-white">
        <div className="mx-auto max-w-md px-6 py-16 md:py-24">
          <p className="text-sm font-medium text-muted">Get started</p>
          <h1
            id="register-heading"
            className="mt-2 font-serif text-[30px] leading-[1.2] text-ink md:text-[36px]"
          >
            Create your account
          </h1>
          <p className="mt-2 text-sm text-body">
            Already have an account?{' '}
            <Link
              to="/login"
              data-testid="link-register-login"
              className="font-semibold text-ink underline hover:text-black"
            >
              Log in
            </Link>
          </p>

          {generalError && (
            <div
              role="alert"
              data-testid="error-register"
              className="mt-6 rounded-lg bg-red-50 p-3.5 text-sm font-medium text-red-700"
            >
              {generalError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
            <div>
              <label htmlFor="fullName" className={labelClass}>
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ada Lovelace"
                data-testid="input-register-fullName"
                className={inputClass}
                required
              />
              {fieldErrors.fullName && (
                <p className={errorText} data-testid="error-register-fullName">
                  {fieldErrors.fullName}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="username" className={labelClass}>
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="adalovelace"
                data-testid="input-register-username"
                className={inputClass}
                required
              />
              {fieldErrors.username && (
                <p className={errorText} data-testid="error-register-username">
                  {fieldErrors.username}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className={labelClass}>
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ada@example.com"
                data-testid="input-register-email"
                className={inputClass}
                required
              />
              {fieldErrors.email && (
                <p className={errorText} data-testid="error-register-email">
                  {fieldErrors.email}
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
                  placeholder="At least 12 characters"
                  data-testid="input-register-password"
                  className={`${inputClass} pr-10`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  data-testid="button-register-toggle-password"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="mt-2.5 rounded-lg border border-line bg-tint/40 p-3">
                <p className="text-xs font-semibold text-ink mb-1.5">Password requirements:</p>
                <ul className="space-y-1">
                  <RuleCheck passed={ruleLength} label="At least 12 characters" />
                  <RuleCheck passed={ruleUpper} label="At least one uppercase letter (A-Z)" />
                  <RuleCheck passed={ruleLower} label="At least one lowercase letter (a-z)" />
                  <RuleCheck passed={ruleDigit} label="At least one number (0-9)" />
                  <RuleCheck passed={ruleSpecial} label="At least one special character (!@#$%...)" />
                </ul>
              </div>

              {fieldErrors.password && (
                <p className={errorText} data-testid="error-register-password">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className={labelClass}>
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                data-testid="input-register-confirmPassword"
                className={inputClass}
                required
              />
              {fieldErrors.confirmPassword && (
                <p className={errorText} data-testid="error-register-confirmPassword">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={loading} data-testid="button-register" className="w-full">
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </div>
          </form>
        </div>
      </section>
    </PageShell>
  );
}

export default RegisterPage;
