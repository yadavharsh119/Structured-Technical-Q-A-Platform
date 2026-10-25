import { LinkButton } from '../ui/Button';

export function FinalCta() {
  return (
    <section aria-labelledby="cta-heading" className="bg-white">
      <div className="mx-auto max-w-content px-6 py-16 text-center md:py-24">
        <h2 id="cta-heading" className="mx-auto max-w-2xl font-serif text-[30px] leading-[1.2] text-ink md:text-[40px]">
          Read first. Contribute when you&apos;re ready.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-[20px] text-body">
          Browsing and comparing are open to everyone. Create a free account to submit
          Questions, share Perspectives and vote.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <LinkButton href="/register">Create account</LinkButton>
          <LinkButton href="/topics" variant="outline">
            Browse Topics
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
