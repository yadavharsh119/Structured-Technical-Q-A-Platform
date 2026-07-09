import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/motion/reveal";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pb-16 pt-16 sm:pb-24 sm:pt-24">
      <div className="container-shell">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <Reveal>
            <div>
              <Badge>Human modeling system</Badge>
              <h1 className="mt-6 max-w-3xl text-balance text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
                Build intelligent systems that understand the people inside the loop.
              </h1>
              <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-[var(--foreground-muted)]">
                Osmion gives teams a premium operating surface for modeling behavior, monitoring signal drift,
                and shaping trustworthy AI decisions with clarity.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/app" size="lg">
                  Enter platform
                </ButtonLink>
                <ButtonLink href="/sign-in" size="lg" variant="secondary">
                  View sign in
                </ButtonLink>
              </div>
              <div className="mt-10 flex flex-wrap gap-6 text-sm text-[var(--foreground-muted)]">
                <span>Typed UI seams for backend integration</span>
                <span>Dark-first premium design system</span>
                <span>Responsive from day one</span>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <Card variant="glass" className="panel-grid relative overflow-hidden p-0">
              <div className="border-b border-white/10 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Signal orchestration</p>
                    <p className="mt-1 text-sm text-[var(--foreground-muted)]">Operator-ready overview</p>
                  </div>
                  <span className="rounded-full border border-emerald-300/18 bg-emerald-400/12 px-3 py-1 text-xs text-emerald-100">
                    Stable
                  </span>
                </div>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Card className="bg-slate-950/65 p-5">
                  <p className="text-xs tracking-[0.22em] text-sky-200 uppercase">Trajectory fit</p>
                  <p className="mt-4 text-4xl font-semibold text-white">94%</p>
                  <p className="mt-3 text-sm leading-6 text-[var(--foreground-muted)]">
                    Alignment confidence after narrative trace enrichment.
                  </p>
                </Card>
                <Card className="bg-slate-950/65 p-5">
                  <p className="text-xs tracking-[0.22em] text-sky-200 uppercase">Observation lanes</p>
                  <p className="mt-4 text-4xl font-semibold text-white">2.6K</p>
                  <p className="mt-3 text-sm leading-6 text-[var(--foreground-muted)]">
                    Realistic system shape without hard-coding live services.
                  </p>
                </Card>
                <div className="sm:col-span-2">
                  <Card className="bg-white/4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">Behavioral map health</p>
                        <p className="mt-1 text-sm text-[var(--foreground-muted)]">
                          UI contracts are ready for future streaming and operator tooling.
                        </p>
                      </div>
                      <div className="flex items-end gap-1">
                        {[38, 52, 48, 69, 66, 78, 88].map((height, index) => (
                          <span
                            key={`${height}-${index}`}
                            className="w-3 rounded-full bg-gradient-to-t from-sky-500 to-cyan-200"
                            style={{ height }}
                          />
                        ))}
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </Card>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
