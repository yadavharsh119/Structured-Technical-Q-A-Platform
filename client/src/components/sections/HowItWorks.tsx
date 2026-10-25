import { HOW_STEPS } from '../../data/mock';
import { SectionHeading } from '../ui/SectionHeading';

export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" id="how-it-works" className="scroll-mt-20 bg-tint">
      <div className="mx-auto max-w-content px-6 py-16 md:py-24">
        <SectionHeading id="how-heading" kicker="How it works" title="From question to comparison in four steps." />
        <ol className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {HOW_STEPS.map((step, i) => (
            <li key={step.title} className="rounded-xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <p className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-sm font-semibold text-white" aria-hidden="true">
                {i + 1}
              </p>
              <h3 className="mt-4 text-base font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-body">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
