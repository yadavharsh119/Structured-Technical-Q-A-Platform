import { Reveal } from "@/components/motion/reveal";
import { Card } from "@/components/ui/card";
import { Section } from "@/components/ui/section";

const valueItems = [
  {
    title: "Decision-ready surface",
    description:
      "A calm, premium interface that keeps operators oriented around mission context instead of tooling noise.",
  },
  {
    title: "Future-safe seams",
    description:
      "Mock data and route boundaries are typed up front so real services can connect without UI rewrites.",
  },
  {
    title: "Readable by design",
    description:
      "Components stay modular and small, with a visual system consistent enough to scale across product surfaces.",
  },
];

export function ValueGrid() {
  return (
    <Section
      id="platform"
      eyebrow="Platform"
      title="A product shell designed to scale from elegant prototype to production system."
      description="The first milestone focuses on the frontend foundations that matter most: composability, clarity, and trustworthy interaction design."
    >
      <div className="grid gap-5 md:grid-cols-3">
        {valueItems.map((item, index) => (
          <Reveal key={item.title} delay={index * 0.06}>
            <Card className="h-full">
              <p className="text-lg font-medium text-white">{item.title}</p>
              <p className="mt-4 text-sm leading-7 text-[var(--foreground-muted)]">
                {item.description}
              </p>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
