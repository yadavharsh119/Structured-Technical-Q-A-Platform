// MOCK DATA: replace with API later
import type { Perspective } from '../types/topic';

type P = [id: string, slug: string, author: string | null, domain: string | null,
  solution: string, explanation: string, adv: string[], lim: string[],
  lang: string | null, code: string | null, refLabel: string | null, refUrl: string | null,
  votes: number, date: string];

const CACHING_EXTRA: Array<[author: string, domain: string | null, approach: string, votes: number, day: string]> = [
  ['david_kim', 'Backend', 'Memcached slab allocation', 17, '2026-10-06'],
  ['elena_petrova', null, 'Postgres materialized views', 15, '2026-10-07'],
  ['alex_morgan', 'Frontend', 'Service-worker cache', 14, '2026-10-08'],
  ['sofia_garcia', 'Security', 'Signed edge tokens', 13, '2026-10-09'],
  ['marcus_chen', 'Databases', 'PgBouncer statement cache', 12, '2026-10-10'],
  ['fatima_hassan', null, 'Varnish in front of origin', 11, '2026-10-11'],
  ['anna_kowalski', null, 'Cache warming on deploy', 10, '2026-10-12'],
  ['tom_baker', 'DevOps', 'Redis Cluster sharding', 9, '2026-10-13'],
  ['sarah_lim', 'Architecture', 'CQRS read models', 9, '2026-10-14'],
  ['priya_nair', 'Frontend', 'HTTP ETag revalidation', 8, '2026-10-15'],
  ['jonas_weber', null, 'Negative caching for misses', 7, '2026-10-16'],
  ['david_kim', null, 'Write-behind coalescing', 6, '2026-10-17'],
  ['maya_chen', 'Backend', 'Request collapsing', 6, '2026-10-18'],
  ['elena_petrova', 'Databases', 'Partitioned cache keys', 5, '2026-10-19'],
  ['alex_morgan', null, 'IndexedDB offline copies', 4, '2026-10-20'],
  ['sofia_garcia', null, 'Pinned TLS session cache', 3, '2026-10-21'],
  ['marcus_chen', null, 'Redis probabilistic expiry', 2, '2026-10-22'],
  ['fatima_hassan', 'DevOps', 'Regional cache replicas', 2, '2026-10-23'],
  ['anna_kowalski', 'Testing', 'Load-test cache sizing', 1, '2026-10-24'],
];

const HAND: P[] = [
['caching-p01', 'caching-strategies-read-heavy-apis', 'maya_chen', 'Backend', 'Use Redis cache-aside with a 5-minute TTL for hot keys.', 'Reads check Redis first and fall back to the database on a miss.', ['Millisecond reads for hot keys.', 'Fine-grained TTLs per key.'], ['Cold starts need warming.', 'Needs stampede protection.'], 'typescript', 'const hit = await redis.get(key);', null, null, 48, '2026-10-02'],
['caching-p02', 'caching-strategies-read-heavy-apis', 'jonas_weber', 'Backend', 'Cache GET responses at the CDN edge with versioned keys.', 'Responses carry long max-age headers; deploys bump key versions.', ['Offloads traffic before origin.', 'Scales globally.'], ['Invalidation is eventual.', 'Poor fit for personalized responses.'], null, null, 'CDN caching guide', 'https://example.com/cdn-caching', 36, '2026-10-03'],
['caching-p03', 'caching-strategies-read-heavy-apis', 'priya_dev', 'Databases', 'Use read-through caching with short TTLs.', 'The cache loader owns the fill path so callers never see a miss.', ['Callers never handle a miss.', 'Single freshness reasoning point.'], ['Write path gets complex.', 'Short TTLs still hit the database.'], 'python', 'user = cache.get(uid) or db.fetch(uid)', null, null, 31, '2026-10-04'],
['caching-p04', 'caching-strategies-read-heavy-apis', null, null, 'Serve stale-while-revalidate from per-host memory.', 'Each host refreshes its copy in the background.', ['No extra infrastructure.', 'Degrades gracefully.'], ['Copies can disagree briefly.', 'Memory caps the working set.'], null, null, null, null, 19, '2026-10-05'],
['jwt-p01', 'jwt-vs-server-side-sessions', 'jonas_weber', 'Security', 'Use short-lived JWTs with rotating refresh tokens.', 'Access tokens live 15 minutes; reuse detection kills the family.', ['Stateless verification.', 'Bounded theft damage.'], ['Needs a denylist until expiry.', 'Tokens grow with claims.'], 'typescript', 'await verifySignature(token, publicKey);', null, null, 22, '2026-07-12'],
['jwt-p02', 'jwt-vs-server-side-sessions', 'sofia_garcia', 'Security', 'Keep sessions server-side with an opaque cookie.', 'A random id maps to Redis state; logout is one delete.', ['Instant revocation.', 'Small cookies.'], ['Store lookup per request.', 'Harder multi-region.'], null, null, 'OWASP sessions', 'https://example.com/owasp-sessions', 14, '2026-07-14'],
['jwt-p03', 'jwt-vs-server-side-sessions', 'marcus_chen', null, 'Split it: JWT for reads, server check for writes.', 'Reads verify locally; mutations confirm the session.', ['Fast reads, safe writes.', 'Limits revocation risk.'], ['Two code paths.', 'Harder guarantees.'], null, null, null, null, 6, '2026-07-20'],
['micro-p01', 'microservices-resilience-patterns', 'sarah_lim', 'Architecture', 'Wrap every dependency in a circuit breaker.', 'Breakers trip past a failure threshold and fail fast.', ['Stops cascades quickly.', 'Clear dashboard signal.'], ['Needs per-dependency tuning.', 'Half-open probes add latency.'], 'go', 'cb := gobreaker.NewCircuitBreaker(settings)', null, null, 21, '2026-09-19'],
['micro-p02', 'microservices-resilience-patterns', 'elena_petrova', null, 'Isolate dependencies with bulkheads.', 'Separate pools per dependency contain slowness.', ['Failure stays contained.', 'Sized from metrics.'], ['More pools to configure.', 'Idle capacity wasted.'], null, null, null, null, 14, '2026-09-22'],
['micro-p03', 'microservices-resilience-patterns', 'david_kim', 'Backend', 'Add bounded retries with jittered backoff.', 'Retries handle blips; budgets cap extra load.', ['Recovers transient faults.', 'Jitter avoids stampedes.'], ['Outage retries add load.', 'Needs idempotency.'], 'java', 'RetryPolicy.withMaxAttempts(3).build();', null, null, 9, '2026-09-25'],
['micro-p04', 'microservices-resilience-patterns', 'priya_dev', 'Architecture', 'Shed load with concurrency limits and queues.', 'Cap in-flight work; return 429 instead of collapsing.', ['Predictable under overload.', 'Queues absorb bursts.'], ['Queued work times out.', 'Clients handle 429s.'], null, null, 'Concurrency limits', 'https://example.com/concurrency-limits', 7, '2026-09-28'],
['archived-p01', 'soap-api-versioning-legacy', 'tom_baker', null, 'Version SOAP contracts with XML namespaces.', 'Each breaking change shipped a new namespace.', ['Old clients never broke.', 'Explicit contract.'], ['Namespace sprawl.', 'Thin tooling.'], 'xml', '<definitions targetNamespace="http://a.example/v2">', null, null, 11, '2025-06-12'],
['archived-p02', 'soap-api-versioning-legacy', 'sarah_lim', 'Architecture', 'Run versioned endpoints side by side.', 'Separate URLs per major version.', ['Simple routing.', 'Enforceable sunsets.'], ['Double surface.', 'Shared code drift.'], null, null, null, null, 7, '2025-06-20'],
];

function toPerspective(p: P): Perspective {
  return {
    id: p[0], topicSlug: p[1], author: p[2], authorTopDomain: p[3],
    solution: p[4], explanation: p[5], advantages: p[6], limitations: p[7],
    codeSnippets: p[8] && p[9] ? [{ language: p[8], code: p[9] }] : [],
    references: p[10] && p[11] ? [{ label: p[10], url: p[11] }] : [],
    upvotes: p[12], createdAt: p[13],
  };
}

const generated: Perspective[] = CACHING_EXTRA.map(([author, domain, approach, votes, day], i) => ({
  id: `caching-g${String(i + 1).padStart(2, '0')}`,
  topicSlug: 'caching-strategies-read-heavy-apis',
  author, authorTopDomain: domain,
  solution: `Adopt ${approach.toLowerCase()} for the read path.`,
  explanation: `Route hot reads through ${approach.toLowerCase()} so the primary database stays off the critical path.`,
  advantages: ['Reduces p99 read latency.', 'Proven pattern in production systems.'],
  limitations: ['Adds an operational component.', 'Needs invalidation planning.'],
  codeSnippets: [],
  references: [],
  upvotes: votes,
  createdAt: day,
}));

const GEN_AUTHORS = ['david_kim', 'elena_petrova', 'alex_morgan', 'sofia_garcia', 'marcus_chen', 'fatima_hassan', 'anna_kowalski', 'tom_baker'];

function genFor(slug: string, prefix: string, n: number): Perspective[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}-g${i + 1}`,
    topicSlug: slug,
    author: GEN_AUTHORS[(i * 3 + n) % GEN_AUTHORS.length],
    authorTopDomain: null,
    solution: `Apply established practice ${i + 1} for this problem.`,
    explanation: `This follows the standard approach documented for this topic and adapts it to the constraints described.`,
    advantages: ['Low implementation risk.', 'Well understood trade-offs.'],
    limitations: ['May not fit every edge case.', 'Needs measurement in your environment.'],
    codeSnippets: [],
    references: [],
    upvotes: 4 + ((n * 7 + i * 3) % 12),
    createdAt: `2026-0${(i % 9) + 1}-1${i % 9}`,
  }));
}

export const PERSPECTIVES: Perspective[] = [
  ...HAND.map(toPerspective),
  ...generated,
  ...genFor('database-connection-pool-exhaustion', 'pool', 6),
  ...genFor('zero-downtime-postgres-migrations', 'mig', 6),
  ...genFor('debouncing-vs-throttling-react', 'bounce', 5),
  ...genFor('redis-eviction-policies-explained', 'evict', 4),
  ...genFor('kubernetes-probe-configuration', 'probe', 5),
  ...genFor('react-server-components-tradeoffs', 'rsc', 3),
  ...genFor('postgres-indexing-strategies', 'idx', 7),
  ...genFor('oauth2-pkce-mobile-apps', 'pkce', 4),
  ...genFor('api-rate-limiting-algorithms', 'limit', 6),
  ...genFor('docker-multi-stage-builds', 'docker', 5),
  ...genFor('testing-pyramid-practical-guide', 'pyr', 6),
  ...genFor('graphql-vs-rest-2026', 'gql', 8),
  ...genFor('web-vitals-optimization-react', 'vitals', 2),
  ...genFor('jwt-refresh-token-rotation', 'refresh', 3),
  ...genFor('kafka-ordering-guarantees', 'kafka', 4),
  ...genFor('playwright-vs-cypress-e2e', 'e2e', 5),
  ...genFor('service-mesh-istio-linkerd', 'mesh', 4),
  ...genFor('react-query-cache-invalidation', 'rq', 3),
  ...genFor('vault-secret-rotation', 'vault', 5),
  ...genFor('contract-testing-pact', 'pact', 4),
];

