import { Reveal } from "@/components/motion/reveal";
import { Card } from "@/components/ui/card";
import { Section } from "@/components/ui/section";

export function SignalSection() {
  return (
    <Section
      id="signals"
      eyebrow="Signals"
      title="Designed for analysts, operators, and future model builders."
      description="The first release emphasizes clarity of state: loading, empty, active, and upcoming pathways all feel deliberate."
    >
      <div className="grid gap-5 lg:grid-cols-3">
        {[
          ["Responsive shell", "Desktop, tablet, and mobile layouts share one coherent visual language."],
          ["Trustworthy motion", "Subtle transitions guide attention without slowing down workflows."],
          ["Accessible defaults", "Clear focus states, semantic structure, and readable contrast are built in."],
        ].map(([title, description], index) => (
          <Reveal key={title} delay={index * 0.06}>
            <Card variant="glass" className="h-full">
              <p className="text-lg font-medium text-white">{title}</p>
              <p className="mt-4 text-sm leading-7 text-[var(--foreground-muted)]">
                {description}
              </p>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
