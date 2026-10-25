// MOCK DATA: replace with API later
import type { SearchTopic } from '../types/search';

type T = [slug: string, title: string, desc: string, cat: string, tags: string[],
  author: string, date: string, count: number, votes: number, snippets: string[]];

// Slugs with a source question (8 of 25); the rest are curated.
const WITH_SOURCE = new Set([
  'microservices-resilience-patterns',
  'database-connection-pool-exhaustion',
  'caching-strategies-read-heavy-apis',
  'jwt-vs-server-side-sessions',
  'zero-downtime-postgres-migrations',
  'postgres-indexing-strategies',
  'kubernetes-hpa-tuning',
  'contract-testing-pact',
]);

const ROWS: T[] = [
['microservices-resilience-patterns', 'Microservices Resilience Patterns', 'Which patterns keep a service mesh responsive when a dependency starts failing?', 'Architecture', ['microservices', 'api-design'], 'sarah_lim', '2026-09-18', 4, 51, ['Circuit breakers stop cascading failures by failing fast.', 'Bulkheads isolate thread pools per dependency.']],
['database-connection-pool-exhaustion', 'Handling Database Connection Pool Exhaustion', 'How do you detect and recover when the connection pool runs dry under load?', 'Databases', ['postgres', 'performance'], 'marcus_chen', '2026-08-02', 6, 74, ['Size pools from measured p99 query latency, not guesses.', 'Add pool wait-time metrics before raising max connections.']],
['caching-strategies-read-heavy-apis', 'Caching Strategies for Read-Heavy APIs', 'Where should caching live when reads dominate and data changes slowly?', 'Backend', ['caching', 'redis', 'api-design'], 'maya_chen', '2026-10-01', 23, 288, ['Redis cache-aside gives millisecond reads for hot keys.', 'CDN edge caching offloads traffic before it reaches origin.']],
['jwt-vs-server-side-sessions', 'JWT vs Server-Side Sessions', 'Which session strategy balances scalability with safe revocation?', 'Security', ['jwt', 'authentication'], 'jonas_weber', '2026-07-11', 3, 42, ['Short-lived JWTs with refresh rotation limit revocation windows.', 'Server sessions make instant logout trivial at the cost of a store lookup.']],
['debouncing-vs-throttling-react', 'Debouncing vs Throttling in React', 'When should an input wait for silence versus fire on a steady interval?', 'Frontend', ['react', 'performance'], 'priya_nair', '2026-06-20', 5, 61, ['Debounce search inputs so requests fire after typing pauses.', 'Throttle scroll handlers to a steady 100ms interval.']],
['zero-downtime-postgres-migrations', 'Zero-Downtime PostgreSQL Migrations', 'How do you ship schema changes without locking tables or dropping writes?', 'Databases', ['postgres', 'docker'], 'elena_petrova', '2026-09-05', 6, 79, ['Expand-contract migrations keep old and new code compatible.', 'Create indexes concurrently to avoid write locks.']],
['redis-eviction-policies-explained', 'Redis Eviction Policies Explained', 'Which eviction policy fits a session store versus a read-through cache?', 'Backend', ['redis', 'caching', 'performance'], 'david_kim', '2026-05-14', 4, 52, ['allkeys-lru fits caches where every key is expendable.', 'volatile-ttl protects persistent keys while expiring sessions.']],
['kubernetes-probe-configuration', 'Kubernetes Probe Configuration', 'How do liveness, readiness and startup probes differ in practice?', 'DevOps', ['kubernetes', 'docker'], 'fatima_hassan', '2026-04-28', 5, 47, ['Readiness gates traffic, liveness triggers restarts.', 'Startup probes protect slow-booting JVM services.']],
['react-server-components-tradeoffs', 'React Server Components Trade-offs', 'When do Server Components help and when do they complicate a codebase?', 'Frontend', ['react', 'performance'], 'alex_morgan', '2026-10-08', 3, 39, ['Server Components cut client bundle size for data-heavy views.', 'They complicate pages needing rich client interactivity.']],
['postgres-indexing-strategies', 'PostgreSQL Indexing Strategies', 'How do you choose between B-tree, GIN and BRIN indexes?', 'Databases', ['postgres', 'performance'], 'marcus_chen', '2026-03-17', 7, 83, ['GIN indexes make JSONB containment queries fast.', 'BRIN wins for naturally ordered time-series tables.']],
['oauth2-pkce-mobile-apps', 'OAuth2 PKCE for Mobile Apps', 'Why is PKCE required for public clients and how is it implemented?', 'Security', ['authentication', 'jwt'], 'sofia_garcia', '2026-02-09', 4, 45, ['PKCE replaces the client secret with a per-request verifier.', 'Store tokens in the OS keychain, never in app storage.']],
['api-rate-limiting-algorithms', 'API Rate Limiting Algorithms', 'Should you use token bucket, sliding window or fixed window counters?', 'Backend', ['api-design', 'performance', 'redis'], 'david_kim', '2026-08-25', 6, 71, ['Sliding window logs are precise but memory heavy.', 'Token buckets in Redis handle bursts smoothly.']],
['testing-pyramid-practical-guide', 'Testing Pyramid Practical Guide', 'How many unit, integration and end-to-end tests should a service have?', 'Testing', ['testing', 'api-design'], 'anna_kowalski', '2025-12-15', 6, 66, ['Contract tests catch breaking API changes earlier than E2E suites.', 'Keep E2E to critical user journeys only.']],
['graphql-vs-rest-2026', 'GraphQL vs REST in 2026', 'Which API style fits a public developer platform versus internal services?', 'Architecture', ['api-design', 'microservices'], 'sarah_lim', '2025-11-30', 8, 91, ['GraphQL reduces over-fetching for varied client needs.', 'REST caching semantics still beat GraphQL at the edge.']],
['web-vitals-optimization-react', 'Web Vitals Optimization in React', 'What actually moves LCP and INP on a content-heavy React site?', 'Frontend', ['react', 'performance', 'testing'], 'priya_nair', '2026-09-28', 2, 24, ['Preload hero images and defer below-fold components.', 'Memoize expensive lists to protect interaction latency.']],
['jwt-refresh-token-rotation', 'JWT Refresh Token Rotation', 'How does refresh token rotation detect theft without annoying users?', 'Security', ['jwt', 'authentication'], 'jonas_weber', '2026-10-11', 3, 41, ['Reuse detection invalidates the whole token family on replay.', 'Short access lifetimes bound the damage of a stolen token.']],
['kafka-ordering-guarantees', 'Kafka Ordering Guarantees', 'How do you keep event order without sacrificing partition parallelism?', 'Architecture', ['microservices', 'performance'], 'elena_petrova', '2026-07-29', 4, 49, ['Keyed partitioning preserves per-entity order.', 'Single-partition topics order globally but cap throughput.']],
['kubernetes-hpa-tuning', 'Kubernetes HPA Tuning Guide', 'Why does the autoscaler flap and how do stabilization windows fix it?', 'DevOps', ['kubernetes', 'performance'], 'fatima_hassan', '2026-08-19', 0, 0, ['Scale on custom latency metrics, not CPU alone.', 'Stabilization windows prevent rapid scale-down flapping.']],
['playwright-vs-cypress-e2e', 'Playwright vs Cypress for E2E', 'Which framework handles multi-tab flows and parallel CI better?', 'Testing', ['testing', 'react'], 'anna_kowalski', '2026-05-30', 5, 54, ['Playwright contexts isolate tests with real multi-tab support.', 'Cypress time-travel debugging speeds up failure triage.']],
['postgres-row-level-security', 'PostgreSQL Row-Level Security', 'Can RLS replace application-level tenant filtering safely?', 'Databases', ['postgres', 'authentication'], 'marcus_chen', '2026-10-05', 0, 0, ['RLS policies enforce tenancy even for ad-hoc queries.', 'Bypass roles must be locked down or policies are theater.']],
['service-mesh-istio-linkerd', 'Service Mesh: Istio vs Linkerd', 'Which mesh fits a small platform team running a dozen services?', 'Architecture', ['microservices', 'kubernetes'], 'sarah_lim', '2026-04-11', 4, 44, ['Linkerd is lighter to operate for small teams.', 'Istio offers deeper traffic policy controls.']],
['react-query-cache-invalidation', 'React Query Cache Invalidation', 'How do you structure query keys so invalidation stays precise?', 'Frontend', ['react', 'caching'], 'alex_morgan', '2026-06-05', 3, 33, ['Hierarchical keys let one prefix invalidate a whole feature.', 'Optimistic updates need rollback handlers for failures.']],
['vault-secret-rotation', 'Vault Secret Rotation Patterns', 'How do you rotate database credentials without restarting every service?', 'Security', ['authentication', 'docker', 'kubernetes'], 'sofia_garcia', '2026-03-08', 5, 57, ['Dynamic secrets give each instance short-lived credentials.', 'Sidecar agents renew leases without app restarts.']],
['contract-testing-pact', 'Contract Testing with Pact', 'Who owns the contract when five consumers share one provider?', 'Testing', ['testing', 'api-design', 'microservices'], 'anna_kowalski', '2026-02-20', 4, 46, ['Consumer-driven contracts let providers verify all expectations in CI.', 'Version contracts alongside the provider API.']],
];

export const SOURCE_BY_SLUG: Record<string, { id: string; title: string; askedBy: string; link: string }> = {};
for (const row of ROWS) {
  if (WITH_SOURCE.has(row[0])) {
    SOURCE_BY_SLUG[row[0]] = {
      id: `q-${row[0]}`,
      title: `How should we approach: ${row[1]}?`,
      askedBy: row[5],
      link: `/questions/q-${row[0]}`,
    };
  }
}

export const ARCHIVED_TOPIC: SearchTopic = {
  slug: 'soap-api-versioning-legacy',
  title: 'SOAP API Versioning for Legacy Clients',
  description: 'How was versioning handled for SOAP endpoints before the REST migration?',
  category: 'Backend',
  tags: ['api-design'],
  author: 'tom_baker',
  createdAt: '2025-06-10',
  perspectiveCount: 2,
  totalUpvotes: 18,
  perspectiveSnippets: ['Namespace versioning kept old contracts stable.', 'Side-by-side endpoints eased the migration.'],
  status: 'archived',
};

export const ARCHIVED_SOURCE = {
  id: 'q-soap-legacy',
  title: 'How did we version the old SOAP endpoints?',
  askedBy: 'tom_baker',
  link: '/questions/q-soap-legacy',
};

export const SEARCH_TOPICS: SearchTopic[] = ROWS.map((r) => ({
  slug: r[0], title: r[1], description: r[2], category: r[3], tags: r[4],
  author: r[5], createdAt: r[6], perspectiveCount: r[7], totalUpvotes: r[8],
  perspectiveSnippets: r[9], status: 'published',
}));

export const SEARCH_CATEGORIES = ['Architecture', 'Databases', 'Backend', 'Security', 'Frontend', 'DevOps', 'Testing'];

export const SEARCH_TAGS = ['caching', 'redis', 'postgres', 'jwt', 'authentication', 'react', 'performance', 'docker', 'kubernetes', 'api-design', 'microservices', 'testing'];

