import { ArrowUp } from 'lucide-react';
import { COMPARISON } from '../../data/mock';
import { SectionHeading } from '../ui/SectionHeading';

const rows = ['Proposed Solution', 'Advantages', 'Limitations'] as const;

export function ComparisonPreview() {
  const [a, b] = COMPARISON.columns;
  return (
    <section aria-labelledby="compare-heading" id="compare" className="scroll-mt-20 bg-white">
      <div className="mx-auto max-w-content px-6 py-16 md:py-24">
        <SectionHeading id="compare-heading" kicker="Side-by-side comparison" title="See the trade-offs at a glance." />
        <p className="mt-4 max-w-2xl text-[20px] text-body">{COMPARISON.lead}</p>
        <div className="mt-10 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[640px] border-collapse bg-white text-left">
            <caption className="sr-only">
              Comparison of two Perspectives on {COMPARISON.topicTitle}
            </caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="w-40 p-5 align-top text-sm font-medium text-muted">
                  {COMPARISON.topicTitle}
                </th>
                <th scope="col" className="p-5 align-top">
                  <span className="block text-sm font-semibold text-ink">{a.label}: Redis cache-aside</span>
                </th>
                <th scope="col" className="p-5 align-top">
                  <span className="block text-sm font-semibold text-ink">{b.label}: HTTP caching with a CDN</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line">
                <th scope="row" className="p-5 align-top text-sm font-semibold text-ink">Proposed Solution</th>
                <td className="p-5 align-top text-base text-body">{a.solution}</td>
                <td className="p-5 align-top text-base text-body">{b.solution}</td>
              </tr>
              {rows.slice(1).map((row) => (
                <tr key={row} className="border-b border-line">
                  <th scope="row" className="p-5 align-top text-sm font-semibold text-ink">{row}</th>
                  <td className="p-5 align-top text-base text-body">
                    <ul className="list-disc space-y-1 pl-5">
                      {(row === 'Advantages' ? a.advantages : a.limitations).map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="p-5 align-top text-base text-body">
                    <ul className="list-disc space-y-1 pl-5">
                      {(row === 'Advantages' ? b.advantages : b.limitations).map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="p-5 text-sm text-muted">Author and votes</td>
                {[a, b].map((c) => (
                  <td key={c.id} className="p-5">
                    <p className="text-sm font-medium text-ink">{c.author}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted">
                      <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                      {c.upvotes} upvotes
                    </p>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}
