import { computeFingerprint, recencyWeight } from '../src/services/fingerprintService';

jest.mock('../src/config/database', () => ({ db: {} }));
jest.mock('../src/repositories/fingerprintRepository', () => ({
  fingerprintRepository: {},
}));
jest.mock('../src/repositories/userRepository', () => ({
  userRepository: {},
}));

const NOW = new Date('2026-06-01T00:00:00Z');
const CATEGORY_A = '11111111-1111-4111-8111-111111111111';
const CATEGORY_B = '22222222-2222-4222-8222-222222222222';
const CATEGORY_C = '33333333-3333-4333-8333-333333333333';

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

function row(
  categoryId: string,
  categoryName: string,
  upvotes: number,
  createdAt: Date,
) {
  return { category_id: categoryId, category_name: categoryName, created_at: createdAt, upvotes };
}

describe('expert fingerprint scoring', () => {
  it('applies the 30-day and 180-day recency weights', () => {
    expect(recencyWeight(daysAgo(10), NOW)).toBe(1.0);
    expect(recencyWeight(daysAgo(60), NOW)).toBe(0.7);
    expect(recencyWeight(daysAgo(200), NOW)).toBe(0.4);
  });

  it('sums weighted (1 + upvotes) scores per category', () => {
    const fingerprint = computeFingerprint(
      [
        row(CATEGORY_A, 'Debugging', 9, daysAgo(5)),
        row(CATEGORY_A, 'Debugging', 3, daysAgo(90)),
        row(CATEGORY_B, 'Security', 1, daysAgo(200)),
      ],
      NOW,
    );

    const debugging = fingerprint.find((entry) => entry.categoryId === CATEGORY_A);
    expect(debugging).toMatchObject({ perspectives: 2, upvotes: 12, rank: 1 });
    expect(debugging?.score).toBeCloseTo(10 + 4 * 0.7, 6);
    expect(fingerprint.find((entry) => entry.categoryId === CATEGORY_B)?.score).toBeCloseTo(0.8, 6);
  });

  it('orders categories by score and returns at most the top three', () => {
    const fingerprint = computeFingerprint(
      [
        row(CATEGORY_A, 'Debugging', 1, daysAgo(5)),
        row(CATEGORY_B, 'Security', 10, daysAgo(5)),
        row(CATEGORY_C, 'Performance', 5, daysAgo(200)),
      ],
      NOW,
    );

    expect(fingerprint.map((entry) => entry.categoryName)).toEqual([
      'Security',
      'Performance',
      'Debugging',
    ]);
    expect(fingerprint.map((entry) => entry.rank)).toEqual([1, 2, 3]);
  });
});
