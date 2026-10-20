import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { registerSchema, type RegisterInput } from '@structured-qa/shared';
import { registerRequest } from '../api/auth';
import { fieldErrorsFromIssues } from '../lib/fieldErrors';

const INPUT_CLASS =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600';

const FIELDS: { name: keyof RegisterInput; label: string; type: string }[] = [
  { name: 'fullName', label: 'Full Name', type: 'text' },
  { name: 'username', label: 'Username', type: 'text' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'password', label: 'Password', type: 'password' },
  { name: 'confirmPassword', label: 'Confirm Password', type: 'password' },
];

export function RegisterPage() {
  const [values, setValues] = useState<RegisterInput>({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const setField = (name: keyof RegisterInput, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromIssues(parsed.error.issues));
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    const response = await registerRequest(parsed.data);
    setSubmitting(false);
    if (response.success) {
      setSucceeded(true);
    } else {
      setFormError(response.error.message);
    }
  };

  if (succeeded) {
    return (
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <h1 className="text-lg font-semibold text-emerald-900" data-testid="register-success">
            Check your email to verify your account.
          </h1>
          <Link
            to="/login"
            data-testid="link-register-login"
            className="mt-4 inline-block text-sm font-medium text-primary-700 hover:underline"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" data-testid="link-register-login" className="text-primary-700 hover:underline">
            Login
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          {FIELDS.map((field) => (
            <div key={field.name}>
              <label
                htmlFor={`register-${field.name}`}
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                {field.label}
              </label>
              <input
                id={`register-${field.name}`}
                type={field.type}
                value={values[field.name]}
                onChange={(event) => setField(field.name, event.target.value)}
                data-testid={`input-register-${field.name}`}
                className={INPUT_CLASS}
              />
              {fieldErrors[field.name] && (
                <p className="mt-1 text-xs text-rose-600" data-testid={`error-register-${field.name}`}>
                  {fieldErrors[field.name]}
                </p>
              )}
            </div>
          ))}

          {formError && (
            <div className="rounded-md bg-rose-50 p-3 text-sm text-rose-700" data-testid="error-register">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            data-testid="button-register"
            className="w-full rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
