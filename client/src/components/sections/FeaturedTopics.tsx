import { TOPICS } from '../../data/mock';
import { SectionHeading } from '../ui/SectionHeading';
import { TopicCard } from '../ui/TopicCard';

export function FeaturedTopics() {
  return (
    <section aria-labelledby="topics-heading" id="topics" className="scroll-mt-20 bg-white">
      <div className="mx-auto max-w-content px-6 py-16 md:py-24">
        <SectionHeading id="topics-heading" kicker="Featured Topics" title="Start with what engineers are asking." />
        <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((topic) => (
            <li key={topic.slug}>
              <TopicCard topic={topic} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
