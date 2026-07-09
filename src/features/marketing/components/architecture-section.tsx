import { Reveal } from "@/components/motion/reveal";
import { Card } from "@/components/ui/card";
import { Section } from "@/components/ui/section";

const architectureItems = [
  "Marketing, auth, and dashboard layouts are separated at the route level.",
  "Reusable primitives live outside features so product modules can expand without duplication.",
  "Motion is applied as a layer, not a dependency of every component.",
  "Mock services mimic async seams, ready for real fetchers later.",
];

export function ArchitectureSection() {
  return (
    <Section
      id="architecture"
      eyebrow="Architecture"
      title="Structured for extension, not just presentation."
      description="This frontend is intentionally shaped around future backend integration, growing teams, and additional product modules."
    >
      <Reveal>
        <Card variant="elevated" className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <p className="text-sm font-medium text-white">Frontend boundaries</p>
            <p className="mt-4 text-sm leading-7 text-[var(--foreground-muted)]">
              Osmion starts with a refined public experience and a focused signed-in shell, but the route tree and
              feature folders are already ready for future workflows, models, and operator tools.
            </p>
          </div>
          <div className="grid gap-3">
            {architectureItems.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-slate-200"
              >
                {item}
              </div>
            ))}
          </div>
        </Card>
      </Reveal>
    </Section>
  );
}
