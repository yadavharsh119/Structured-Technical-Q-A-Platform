import { Columns2, Globe, KeyRound, LayoutTemplate } from 'lucide-react';
import { FACT_ITEMS } from '../../data/mock';

const icons = {
  globe: Globe,
  template: LayoutTemplate,
  columns: Columns2,
  login: KeyRound,
};

export function FactStrip() {
  return (
    <section aria-label="Platform highlights" className="border-y border-line bg-white">
      <ul className="mx-auto flex max-w-content flex-col items-center justify-between gap-4 px-6 py-8 text-center sm:flex-row sm:flex-wrap md:flex-nowrap">
        {FACT_ITEMS.map((item) => {
          const Icon = icons[item.icon];
          return (
            <li key={item.label} className="flex items-center gap-2 text-sm font-medium text-muted">
              <Icon className="h-4 w-4 text-deco" aria-hidden="true" />
              {item.label}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
