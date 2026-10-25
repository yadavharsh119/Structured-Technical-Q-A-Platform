import { ArrowUp, Search } from 'lucide-react';
import { HERO_DETAIL, HERO_PERSPECTIVES, HERO_SIDEBAR } from '../../data/mock';
import { LinkButton } from '../ui/Button';

export function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="bg-white">
      <div className="mx-auto grid max-w-content items-center gap-12 px-6 py-16 lg:grid-cols-[55%_45%] lg:py-24">
        <div className="fade-in">
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm font-medium text-secondary hover:text-black"
          >
            <span className="rounded bg-black px-1.5 py-0.5 text-xs font-semibold text-white">NEW</span>
            Structured answers for engineers <span aria-hidden="true">→</span>
          </a>
          <h1
            id="hero-heading"
            className="mt-6 font-serif text-[36px] font-medium leading-[1.1] tracking-[-0.02em] text-ink lg:text-[56px]"
          >
            Answers you can compare, not just scroll.
          </h1>
          <p className="mt-5 max-w-xl text-[20px] font-normal leading-relaxed text-body">
            Every answer follows the same structure: solution, explanation, advantages and
            limitations. So you can weigh trade-offs side by side instead of guessing which
            answer fits.
          </p>
          <form action="/search" method="get" role="search" className="mt-8 flex max-w-xl gap-2">
            <label htmlFor="site-search" className="sr-only">
              Search topics
            </label>
            <input
              id="site-search"
              name="q"
              type="search"
              aria-label="Search topics"
              placeholder="Search topics, e.g. rate limiting"
              className="h-12 w-full rounded-lg border border-line bg-white px-4 text-base text-ink placeholder:text-muted"
            />
            <button
              type="submit"
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-lg bg-black px-5 text-sm font-medium text-white hover:bg-secondary"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Search
            </button>
          </form>
          <div className="mt-4">
            <LinkButton href="/topics">Browse Topics</LinkButton>
          </div>
        </div>
        <div className="relative" aria-label="Preview of a StackRationale Topic view">
          <div
            className="absolute -inset-6 rounded-[24px] bg-gradient-to-br from-emerald-100 via-teal-50 to-white blur-2xl"
            aria-hidden="true"
          />
          <div className="relative flex overflow-hidden rounded-xl border border-line bg-white shadow-[0_24px_60px_-24px_rgba(0,0,0,0.25)]">
            <div className="hidden w-28 shrink-0 flex-col gap-1 border-r border-line bg-white p-3 md:flex">
              {HERO_SIDEBAR.map((item, i) => (
                <span
                  key={item}
                  className={`rounded-md px-2 py-1.5 text-xs font-medium ${i === 0 ? 'bg-tint text-ink' : 'text-muted'}`}
                >
                  {item}
                </span>
              ))}
            </div>
            <div className="w-full flex-1 space-y-2 border-r border-line p-3 md:max-w-[220px]">
              {HERO_PERSPECTIVES.map((p) => (
                <div
                  key={p.id}
                  className={`rounded-lg border p-3 ${p.active ? 'border-ink bg-white' : 'border-line bg-white'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-[10px] font-semibold text-white">
                      {p.initials}
                    </span>
                    <p className="text-xs font-medium text-ink">{p.author}</p>
                    <span className="ml-auto h-2 w-2 rounded-full bg-success" aria-hidden="true" />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-body">{p.snippet}</p>
                  <p className="mt-2 flex items-center justify-between text-[12px] text-muted">
                    <span>{p.timestamp}</span>
                    <span className="inline-flex items-center gap-0.5 font-medium text-ink">
                      <ArrowUp className="h-3 w-3" aria-hidden="true" />
                      {p.upvotes}
                    </span>
                  </p>
                </div>
              ))}
            </div>
            <div className="hidden w-56 shrink-0 flex-col p-4 lg:flex">
              <p className="text-[12px] text-muted">{HERO_DETAIL.topicTitle}</p>
              <p className="mt-1 text-sm font-semibold text-ink">{HERO_DETAIL.author}</p>
              <div className="mt-3 space-y-3">
                {HERO_DETAIL.blocks.map((b) => (
                  <div key={b.heading}>
                    <p className="text-xs font-semibold text-ink">{b.heading}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-body">{b.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
