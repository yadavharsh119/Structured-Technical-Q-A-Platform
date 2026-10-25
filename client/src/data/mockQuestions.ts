export interface PendingQuestionAttachment {
  name: string;
  size: number; // bytes
}

export interface PendingQuestion {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  submitterName: string;
  submittedDate: string;
  attachments: PendingQuestionAttachment[];
}

export const INITIAL_PENDING_QUESTIONS: PendingQuestion[] = [
  {
    id: 'pq-101',
    title: 'Optimizing Garbage Collection in High-Throughput Node.js Services',
    description:
      'We are running a cluster of Node.js microservices processing over 20,000 requests per second. Under peak load, V8 garbage collection pauses cause spike in p99 latencies up to 800ms. What memory allocation strategies, GC flag tunings (--max-old-space-size, --semi-space-interval), and memory leak detection tools exist to mitigate this latency jitter?',
    category: 'Backend',
    tags: ['Node.js', 'V8', 'Performance', 'Garbage Collection'],
    submitterName: 'alex_dev',
    submittedDate: '2026-10-16',
    attachments: [
      { name: 'heap_profile_latency_spike.png', size: 1245184 },
      { name: 'v8_gc_trace_logs.txt', size: 358400 },
    ],
  },
  {
    id: 'pq-102',
    title: 'Zero-Downtime PostgreSQL Schema Migrations with Blue-Green Deployments',
    description:
      'When executing database schema migrations in a blue-green deployment model, breaking column renames or removals break the previous deployment version during the transition window. What patterns (e.g. expand-contract, view abstractions, or dual writes) allow seamless zero-downtime migrations without table locking?',
    category: 'Databases',
    tags: ['PostgreSQL', 'Migrations', 'Database', 'DevOps'],
    submitterName: 'rachel_cloud',
    submittedDate: '2026-10-17',
    attachments: [
      { name: 'migration_sequence_diagram.pdf', size: 819200 },
    ],
  },
  {
    id: 'pq-103',
    title: 'Benchmarking Redis vs Memcached for Multi-Region Session Storage',
    description:
      'We need a low-latency session cache across 3 geographical cloud regions. We are evaluating Redis Cluster with active-passive replication versus Memcached with application-level hashing. What are the replication latency, memory overhead, and failure recovery trade-offs between both solutions at scale?',
    category: 'Backend',
    tags: ['Redis', 'Memcached', 'Caching', 'Multi-Region'],
    submitterName: 'david_architect',
    submittedDate: '2026-10-18',
    attachments: [
      { name: 'benchmark_results_50k_rps.csv', size: 153600 },
      { name: 'cluster_architecture.png', size: 2097152 },
    ],
  },
  {
    id: 'pq-104',
    title: 'Handling Poison Pill Messages in Kafka Consumer Groups',
    description:
      'In a high-volume event stream, corrupted or unparseable messages crash consumer pods repeatedly, creating infinite retry loops. What are the best practices for Dead Letter Queues (DLQ), circuit breaker interceptors, and non-blocking retry topics in Apache Kafka without losing event ordering?',
    category: 'Architecture',
    tags: ['Kafka', 'Microservices', 'Event-Driven', 'Resilience'],
    submitterName: 'vikram_s',
    submittedDate: '2026-10-18',
    attachments: [],
  },
];
