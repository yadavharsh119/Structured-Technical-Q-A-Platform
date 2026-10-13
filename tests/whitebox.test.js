/**
 * WHITE-BOX UNIT TESTS (Internal Logic & State Verification)
 * 
 * Tests the internal functions, data structures, branch conditions,
 * and state mutators directly with complete knowledge of the code implementation.
 */

import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateUsername,
  validateQuestion,
  validatePerspective,
  validateRegister,
  validateLogin,
} from '../lib/validators.js';

import {
  timeAgo,
  truncate,
  slugify,
  getInitials,
  expLevelColor,
  sortByVotes,
  sortByTrending,
  filterBySearch,
  filterByTopic,
} from '../lib/utils.js';

import {
  SEED_USERS,
  SEED_TOPICS,
  SEED_QUESTIONS,
  SEED_PERSPECTIVES,
} from '../lib/seed.js';

describe('White-Box Testing: Internal Validation Logic', () => {
  describe('validateEmail (Branch & Boundary Coverage)', () => {
    test('returns error for empty or whitespace-only inputs', () => {
      expect(validateEmail('')).toBe('Email is required');
      expect(validateEmail('   ')).toBe('Email is required');
      expect(validateEmail(null)).toBe('Email is required');
    });

    test('validates incorrect regex structures', () => {
      expect(validateEmail('plainaddress')).toBe('Please enter a valid email address');
      expect(validateEmail('missing@dot')).toBe('Please enter a valid email address');
      expect(validateEmail('@missinguser.com')).toBe('Please enter a valid email address');
      expect(validateEmail('user@.com')).toBe('Please enter a valid email address');
    });

    test('passes valid RFC-compliant emails', () => {
      expect(validateEmail('sarah@dev.com')).toBeNull();
      expect(validateEmail('engineer.name+tag@company.co.in')).toBeNull();
    });
  });

  describe('validatePassword (Statement & Path Coverage)', () => {
    test('enforces minimum 8 characters constraint', () => {
      expect(validatePassword('Pass1')).toBe('Password must be at least 8 characters');
    });

    test('enforces uppercase letter requirement', () => {
      expect(validatePassword('lowercase123')).toBe('Password must contain at least one uppercase letter');
    });

    test('enforces numeric digit requirement', () => {
      expect(validatePassword('NoNumbersHere')).toBe('Password must contain at least one number');
    });

    test('passes valid complex passwords', () => {
      expect(validatePassword('Password123')).toBeNull();
      expect(validatePassword('Complex#Secret9')).toBeNull();
    });
  });

  describe('validateQuestion (Boundary Value Analysis)', () => {
    test('fails if title is under 20 characters', () => {
      const res = validateQuestion({
        title: 'Too short',
        context: 'A sufficiently long context string that meets the minimum fifty character length limit for testing.',
        topics: ['react'],
        type: 'Experience-based',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.title).toContain('Title is too short');
    });

    test('fails if context is under 50 characters', () => {
      const res = validateQuestion({
        title: 'How do you handle microservices architecture in Node?',
        context: 'Short context',
        topics: ['nodejs'],
        type: 'Experience-based',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.context).toContain('Context is too short');
    });

    test('fails if no topic selected', () => {
      const res = validateQuestion({
        title: 'How do you handle microservices architecture in Node?',
        context: 'A sufficiently long context string that meets the minimum fifty character length limit for testing.',
        topics: [],
        type: 'Experience-based',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.topics).toBe('Please select at least one topic');
    });

    test('succeeds with all valid boundary inputs', () => {
      const res = validateQuestion({
        title: 'How do you structure complex React state in production?',
        context: 'We are evaluating Zustand vs Redux Toolkit for an app with 50+ screens and complex real-time WebSocket feeds.',
        topics: ['react'],
        type: 'Comparison',
      });
      expect(res.isValid).toBe(true);
      expect(Object.keys(res.errors)).toHaveLength(0);
    });
  });

  describe('validatePerspective (5-Section Structural Check)', () => {
    test('fails if any of the mandatory 5 sections are missing', () => {
      const incomplete = {
        background: 'Senior dev with 8 years of React and full-stack development experience.',
        experience: 'We migrated our entire system over 12 months with zero customer downtime during rollout.',
        whatWorked: 'Gradual feature flags and strict API contract versioning across services.',
        // missing whatDidntWork and advice
      };
      const res = validatePerspective(incomplete);
      expect(res.isValid).toBe(false);
      expect(res.errors.whatDidntWork).toBeDefined();
      expect(res.errors.advice).toBeDefined();
    });

    test('succeeds when all 5 sections fulfill length constraints', () => {
      const complete = {
        background: 'Senior Frontend Engineer with 8 years of experience building scalable enterprise React apps.',
        experience: 'We went through a full architectural rewrite from Redux Thunk to TanStack Query and Context across 40 engineers.',
        whatWorked: 'Colocating server cache with React Query and using optimistic UI updates for instant perceived latency.',
        whatDidntWork: 'Trying to store server state in local components led to stale data and sync bugs across browser tabs.',
        advice: 'Never treat server state as client state. Use specialized query cache libraries and let React focus on presentation.',
      };
      const res = validatePerspective(complete);
      expect(res.isValid).toBe(true);
      expect(Object.keys(res.errors)).toHaveLength(0);
    });
  });
});

describe('White-Box Testing: Utility Functions & Data Transformation', () => {
  test('timeAgo returns correct humanized strings across boundaries', () => {
    const now = new Date();
    expect(timeAgo(new Date(now - 10000).toISOString())).toBe('just now');
    expect(timeAgo(new Date(now - 300000).toISOString())).toBe('5m ago');
    expect(timeAgo(new Date(now - 7200000).toISOString())).toBe('2h ago');
    expect(timeAgo(new Date(now - 172800000).toISOString())).toBe('2d ago');
  });

  test('slugify transforms strings to URL-friendly slugs', () => {
    expect(slugify('System Design & Architecture')).toBe('system-design-architecture');
    expect(slugify('React 19 & Next.js! #1')).toBe('react-19-nextjs-1');
  });

  test('getInitials extracts upper-case initials accurately', () => {
    expect(getInitials('Sarah Chen')).toBe('SC');
    expect(getInitials('Priya')).toBe('P');
    expect(getInitials('Marcus Aurelius Webb')).toBe('MW');
  });

  test('expLevelColor maps experience levels to color tokens', () => {
    expect(expLevelColor('Junior')).toBe('#10B981');
    expect(expLevelColor('Senior')).toBe('#F59E0B');
    expect(expLevelColor('UnknownLevel')).toBe('#8888AA');
  });

  test('sortByVotes sorts perspectives descending', () => {
    const list = [{ upvotes: 12 }, { upvotes: 45 }, { upvotes: 3 }];
    const sorted = sortByVotes(list);
    expect(sorted[0].upvotes).toBe(45);
    expect(sorted[1].upvotes).toBe(12);
    expect(sorted[2].upvotes).toBe(3);
  });

  test('filterBySearch filters by title and context', () => {
    const questions = [
      { title: 'Docker containerization tips', context: 'Setting up production images' },
      { title: 'React state management', context: 'Comparing Zustand and Redux' },
    ];
    expect(filterBySearch(questions, 'docker')).toHaveLength(1);
    expect(filterBySearch(questions, 'zustand')).toHaveLength(1);
    expect(filterBySearch(questions, 'nonexistent')).toHaveLength(0);
  });
});

describe('White-Box Testing: Seed Data Integrity', () => {
  test('all seed users have unique IDs, valid emails, and required attributes', () => {
    const ids = new Set();
    const emails = new Set();

    SEED_USERS.forEach(u => {
      expect(ids.has(u.id)).toBe(false);
      expect(emails.has(u.email)).toBe(false);
      ids.add(u.id);
      emails.add(u.email);

      expect(u.name).toBeDefined();
      expect(u.username).toBeDefined();
      expect(u.experienceLevel).toBeDefined();
    });
  });

  test('all seed perspectives belong to existing questions and users', () => {
    const userIds = new Set(SEED_USERS.map(u => u.id));
    const questionIds = new Set(SEED_QUESTIONS.map(q => q.id));

    SEED_PERSPECTIVES.forEach(p => {
      expect(userIds.has(p.authorId)).toBe(true);
      expect(questionIds.has(p.questionId)).toBe(true);
      expect(p.background.length).toBeGreaterThan(30);
      expect(p.experience.length).toBeGreaterThan(50);
      expect(p.whatWorked.length).toBeGreaterThan(30);
      expect(p.whatDidntWork.length).toBeGreaterThan(30);
      expect(p.advice.length).toBeGreaterThan(30);
    });
  });
});
