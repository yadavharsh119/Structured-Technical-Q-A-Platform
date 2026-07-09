"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const [requestAccessOpen, setRequestAccessOpen] = useState(false);

  const hint = useMemo(
    () =>
      "This is a frontend-only flow for now. Submission is simulated but shaped like a real product entry point.",
    [],
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!isValidEmail(email)) {
      setError("Enter a valid work email to continue.");
      return;
    }

    startTransition(() => {
      window.setTimeout(() => {
        setSuccess("Magic link prepared. Connect this seam to Auth.js when the backend is ready.");
      }, 900);
    });
  };

  return (
    <>
      <Card variant="glass" className="w-full max-w-md p-7 sm:p-8">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] text-sky-200 uppercase">Access platform</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Sign in to Osmion</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--foreground-muted)]">
            Enter your work email to access the product shell and future human modeling workflows.
          </p>
        </div>
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <Input
            label="Work email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={error}
            hint={!error ? hint : undefined}
            icon={
              <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-1.5">
                <path d="M3.75 6.75h16.5v10.5H3.75z" />
                <path d="m4.5 7.5 7.5 6 7.5-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />
          <div className="grid gap-3">
            <Button type="submit" size="lg" loading={isPending}>
              Send magic link
            </Button>
            <Button type="button" size="lg" variant="secondary" onClick={() => setRequestAccessOpen(true)}>
              Request access
            </Button>
            <ButtonLink href="/app" size="lg" variant="ghost">
              Continue to platform preview
            </ButtonLink>
          </div>
          {success ? (
            <p className="rounded-2xl border border-emerald-300/18 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              {success}
            </p>
          ) : null}
        </form>
      </Card>
      <Modal
        open={requestAccessOpen}
        onClose={() => setRequestAccessOpen(false)}
        title="Request access"
        description="This modal is a frontend placeholder for future invite and onboarding flows."
      >
        <p className="text-sm leading-6 text-[var(--foreground-muted)]">
          Connect this to a waitlist or invite API later. For now, the platform preview remains accessible so the UI can
          be reviewed end to end.
        </p>
      </Modal>
    </>
  );
}
