import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/motion/reveal";

export function CtaSection() {
  return (
    <section className="pb-24">
      <div className="container-shell">
        <Reveal>
          <Card variant="glass" className="overflow-hidden p-8 sm:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold tracking-[0.24em] text-sky-200 uppercase">
                  Ready to explore
                </p>
                <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Step into the frontend foundation for Osmion&apos;s intelligent platform.
                </h2>
                <p className="mt-4 text-pretty text-base leading-7 text-[var(--foreground-muted)]">
                  The first release already includes a refined public site, auth entry point, and internal product shell.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/app" size="lg">
                  Open dashboard
                </ButtonLink>
                <ButtonLink href="/sign-in" size="lg" variant="secondary">
                  Sign in UI
                </ButtonLink>
              </div>
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}
