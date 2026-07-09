import { Logo } from "@/components/ui/logo";

export function Footer() {
  return (
    <footer className="border-t border-white/8 py-10">
      <div className="container-shell flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Logo />
          <p className="mt-4 max-w-md text-sm leading-6 text-[var(--foreground-muted)]">
            Premium interface foundations for human modeling and intelligent systems.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--foreground-muted)]">
          <a href="/sign-in" className="hover:text-white">
            Sign in
          </a>
          <a href="/app" className="hover:text-white">
            Platform
          </a>
          <a href="mailto:hello@osmion.ai" className="hover:text-white">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
