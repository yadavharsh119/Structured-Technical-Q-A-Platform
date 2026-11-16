// MOCK DATA: replace with API later
import type {
  ComparisonTable,
  FactItem,
  FingerprintDomain,
  HeroDetail,
  HeroPerspective,
  Topic,
} from '../types/landing';
import { HOW_STEPS } from './steps';

export { HOW_STEPS };

export const PLATFORM_NAME = 'StackRationale';

export const TOPICS: Topic[] = [
  {
    slug: 'microservices-resilience-patterns',
    title: 'Microservices Resilience Patterns',
    category: 'Architecture',
    description: 'Which patterns keep a service mesh responsive when a dependency starts failing?',
    perspectiveCount: 4,
  },
  {
    slug: 'database-connection-pool-exhaustion',
    title: 'Handling Database Connection Pool Exhaustion',
    category: 'Databases',
    description: 'How do you detect and recover when the connection pool runs dry under load?',
    perspectiveCount: 6,
  },
  {
    slug: 'caching-strategies-read-heavy-apis',
    title: 'Caching Strategies for Read-Heavy APIs',
    category: 'Backend',
    description: 'Where should caching live when reads dominate and data changes slowly?',
    perspectiveCount: 23,
  },
  {
    slug: 'jwt-vs-server-side-sessions',
    title: 'JWT vs Server-Side Sessions',
    category: 'Security',
    description: 'Which session strategy balances scalability with safe revocation?',
    perspectiveCount: 3,
  },
  {
    slug: 'debouncing-vs-throttling-react',
    title: 'Debouncing vs Throttling in React',
    category: 'Frontend',
    description: 'When should an input wait for silence versus fire on a steady interval?',
    perspectiveCount: 5,
  },
  {
    slug: 'zero-downtime-postgres-migrations',
    title: 'Zero-Downtime PostgreSQL Migrations',
    category: 'Databases',
    description: 'How do you ship schema changes without locking tables or dropping writes?',
    perspectiveCount: 6,
  },
];

export const HERO_SIDEBAR = ['Topics', 'Questions', 'Compare', 'Profile'];

export const HERO_PERSPECTIVES: HeroPerspective[] = [
  {
    id: 'p1',
    author: 'Maya Chen',
    initials: 'MC',
    snippet: 'Cache-aside with Redis keeps hot reads fast…',
    timestamp: '2h ago',
    upvotes: 48,
    active: true,
  },
  {
    id: 'p2',
    author: 'Jonas Weber',
    initials: 'JW',
    snippet: 'CDN edge caching cuts origin traffic…',
    timestamp: '5h ago',
    upvotes: 36,
  },
  {
    id: 'p3',
    author: 'Priya Nair',
    initials: 'PN',
    snippet: 'Read-through with short TTLs simplifies…',
    timestamp: '1d ago',
    upvotes: 21,
  },
];

export const HERO_DETAIL: HeroDetail = {
  author: 'Maya Chen',
  initials: 'MC',
  topicTitle: 'Caching Strategies for Read-Heavy APIs',
  blocks: [
    { heading: 'Proposed Solution', text: 'Use Redis cache-aside for hot keys with a 5-minute TTL.' },
    { heading: 'Explanation', text: 'Reads hit Redis first and fall back to the database on a miss.' },
    { heading: 'Advantages', text: 'Fast reads and full control over invalidation.' },
    { heading: 'Limitations', text: 'Needs cache warming and stampede protection.' },
  ],
};

export const FACT_ITEMS: FactItem[] = [
  { label: 'Open to guests', icon: 'globe' },
  { label: 'One structured template', icon: 'template' },
  { label: 'Side-by-side comparison', icon: 'columns' },
  { label: 'Login with Google or GitHub', icon: 'login' },
];

export const COMPARISON: ComparisonTable = {
  topicTitle: 'Caching Strategies for Read-Heavy APIs',
  lead: 'Two Perspectives on the same Topic, compared field by field.',
  columns: [
    {
      id: 'a',
      label: 'Perspective A',
      solution: 'Use Redis cache-aside: the app checks Redis first and queries the database only on a miss.',
      advantages: ['Millisecond reads for hot keys.', 'Fine-grained TTLs and invalidation.'],
      limitations: ['Adds infrastructure to operate.', 'Cold starts need warming.'],
      author: 'Maya Chen',
      upvotes: 48,
    },
    {
      id: 'b',
      label: 'Perspective B',
      solution: 'Use HTTP caching with a CDN: cache GET responses at the edge with versioned keys.',
      advantages: ['Offloads traffic before it reaches origin.', 'Scales globally with little app code.'],
      limitations: ['Invalidation is eventually consistent.', 'Poor fit for personalized responses.'],
      author: 'Jonas Weber',
      upvotes: 36,
    },
  ],
};

export const FINGERPRINT_SAMPLE: FingerprintDomain[] = [
  { domain: 'Security', perspectives: 15, upvotes: 42 },
  { domain: 'Backend', perspectives: 11, upvotes: 35 },
  { domain: 'Databases', perspectives: 9, upvotes: 28 },
];
