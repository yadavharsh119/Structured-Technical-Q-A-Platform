import { PLATFORM_NAME } from '../../data/mock';

const groups = [
  { title: 'Platform', links: [
    { label: 'Topics', href: '/topics' },
    { label: 'Search', href: '/search' },
    { label: 'Compare', href: '/#compare' },
  ]},
  { title: 'Account', links: [
    { label: 'Log in', href: '/login' },
    { label: 'Sign up', href: '/register' },
  ]},
  { title: 'Project', links: [{ label: 'GitHub', href: '#' }] },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto max-w-content px-6 py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <a href="/" className="flex items-center gap-2" aria-label={`${PLATFORM_NAME} home`}>
              <span className="inline-block h-5 w-5 bg-black" aria-hidden="true" />
              <span className="text-base font-semibold text-ink">{PLATFORM_NAME}</span>
            </a>
            <p className="mt-3 max-w-xs text-base text-body">
              Structured technical Q&amp;A where Perspectives can be compared side by side.
            </p>
          </div>
          {groups.map((g) => (
            <nav key={g.title} aria-label={g.title}>
              <h2 className="text-sm font-medium text-ink">{g.title}</h2>
              <ul className="mt-3 space-y-2">
                {g.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-sm font-medium text-muted hover:text-black">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <p className="mt-10 border-t border-line pt-6 text-xs text-muted">
          © 2026 {PLATFORM_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
