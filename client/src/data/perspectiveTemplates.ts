export const PERSPECTIVE_TEMPLATES = [
  {
    id: 'debugging',
    name: 'Debugging',
    proposedSolution: 'Identify and resolve the root cause in the execution path.',
    explanation:
      'Root Cause Analysis:\n1. Reproduction steps and observed symptoms\n2. Underlying mechanism failure\n3. Verification and prevention steps',
    advantages: ['Directly resolves symptom without regression', 'Minimal blast radius'],
    limitations: [
      'May require downtime or configuration restart',
      'Does not address adjacent architectural bottlenecks',
    ],
  },
  {
    id: 'system-design',
    name: 'System Design',
    proposedSolution: 'Decouple state and scale using asynchronous event-driven pipelines.',
    explanation:
      'Architecture Overview:\n1. Ingress and validation layer\n2. Partitioned message bus for durable delivery\n3. Horizontally scaled consumers and read caches',
    advantages: [
      'High throughput and resilience against bursts',
      'Independent scalability of components',
    ],
    limitations: [
      'Introduces eventual consistency latency',
      'Increased operational complexity and monitoring overhead',
    ],
  },
  {
    id: 'tech-comparison',
    name: 'Technology Comparison',
    proposedSolution: 'Select the optimal technology based on access patterns and team constraints.',
    explanation:
      'Comparative Evaluation:\n1. Performance under high concurrency\n2. Developer ergonomics and maintenance cost\n3. Integration with existing stack',
    advantages: [
      'Proven reliability and rich community ecosystem',
      'Clear migration and rollback paths',
    ],
    limitations: [
      'Higher licensing or infrastructure costs',
      'Steeper initial learning curve',
    ],
  },
] as const;
