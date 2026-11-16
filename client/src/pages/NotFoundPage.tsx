import { Link } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';

export function NotFoundPage({ message }: { message?: string }) {
  return (
    <PageShell>
      <section aria-labelledby="not-found-heading" className="bg-white">
        <div className="mx-auto max-w-content px-6 py-16 text-center md:py-24">
          <p className="text-sm font-medium text-muted">404</p>
          <h1 id="not-found-heading" className="mx-auto mt-3 max-w-xl font-serif text-[30px] leading-[1.2] text-ink md:text-[40px]">
            {message ?? "This page isn't built yet."}
          </h1>
          <Link
            to="/"
            className="mt-8 inline-flex items-center justify-center rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-secondary"
          >
            Back to home
          </Link>
        </div>
      </section>
    </PageShell>
  );
}

export default NotFoundPage;
