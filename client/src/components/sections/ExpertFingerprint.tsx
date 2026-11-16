import { Fingerprint } from 'lucide-react';
import { FINGERPRINT_SAMPLE } from '../../data/mock';
import { SectionHeading } from '../ui/SectionHeading';

export function ExpertFingerprint() {
  return (
    <section aria-labelledby="fingerprint-heading" id="expert-fingerprint" className="scroll-mt-20 bg-tint">
      <div className="mx-auto grid max-w-content items-center gap-12 px-6 py-16 md:py-24 lg:grid-cols-2">
        <div>
          <SectionHeading
            id="fingerprint-heading"
            kicker="Expert Fingerprint"
            title="Expertise shown by contributions, not claims."
          />
          <p className="mt-5 max-w-xl text-base leading-relaxed text-body">
            Your Fingerprint highlights the domains where you contribute most, based on how
            many Perspectives you submit, how many upvotes they get, and how recent they are.
          </p>
        </div>
        <div className="rounded-xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <p className="flex items-center justify-between text-sm font-medium text-muted">
            <span className="inline-flex items-center gap-2 text-ink">
              <Fingerprint className="h-4 w-4" aria-hidden="true" />
              Expert Fingerprint
            </span>
            <span className="rounded-full border border-line px-2.5 py-0.5 text-xs font-medium">Sample</span>
          </p>
          <ul className="mt-5 space-y-4">
            {FINGERPRINT_SAMPLE.map((d) => (
              <li key={d.domain} className="border-b border-line pb-4 last:border-0 last:pb-0">
                <p className="text-base font-semibold text-ink">{d.domain}</p>
                <p className="mt-1 text-sm text-body">
                  {d.perspectives} Perspectives, {d.upvotes} upvotes
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-tint" aria-hidden="true">
                  <div className="h-full rounded-full bg-black" style={{ width: `${Math.min(100, d.upvotes * 2)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
