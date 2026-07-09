import { SignInForm } from "@/features/auth/components/sign-in-form";

export default function SignInPage() {
  return (
    <div className="grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
      <div className="hidden lg:block">
        <p className="text-xs font-semibold tracking-[0.25em] text-sky-200 uppercase">Quiet premium access</p>
        <h1 className="mt-5 max-w-xl text-balance text-5xl font-semibold tracking-tight text-white">
          Entry surfaces that feel trustworthy before the backend arrives.
        </h1>
        <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-[var(--foreground-muted)]">
          This auth view is intentionally production-minded: polished states, clear intent, and a clean seam for future
          Auth.js integration.
        </p>
        <div className="mt-10 rounded-[32px] border border-white/10 bg-white/4 p-6">
          <p className="text-sm font-medium text-white">Included in this milestone</p>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--foreground-muted)]">
            <li>Premium landing page and responsive navigation</li>
            <li>Signed-in dashboard shell with overview and settings</li>
            <li>Reusable frontend primitives and typed mock contracts</li>
          </ul>
        </div>
        <p className="mt-8 text-sm text-[var(--foreground-muted)]">
          Prefer to inspect the signed-in shell directly?{" "}
          <a href="/app" className="text-white hover:text-sky-100">
            Continue to platform preview
          </a>
        </p>
      </div>
      <div className="flex justify-center lg:justify-end">
        <SignInForm />
      </div>
    </div>
  );
}
