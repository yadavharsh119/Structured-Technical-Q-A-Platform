// lib/utils.js — Utility functions

/**
 * Format a date string to a relative time string
 * e.g. "3 days ago", "just now", "2 months ago"
 */
export function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now  = new Date();
  const diff = Math.floor((now - date) / 1000); // seconds

  if (diff < 60)                return 'just now';
  if (diff < 3600)              return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)             return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30)        return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 86400 * 365)       return `${Math.floor(diff / (86400 * 30))} months ago`;
  return `${Math.floor(diff / (86400 * 365))} years ago`;
}

/**
 * Format a date as a readable string
 */
export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

/**
 * Generate a unique ID
 */
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Slugify a string
 */
export function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Truncate a string to maxLength, appending '...'
 */
export function truncate(str, maxLength = 120) {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength).trim() + '…';
}

/**
 * Capitalize first letter
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Debounce function
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Get initials from a name
 */
export function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Deep clone an object (JSON-safe)
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Simulate a network delay (for mock API)
 */
export function mockDelay(ms = 300) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get a color hex for experience level
 */
export function expLevelColor(level) {
  const map = {
    'Junior':   '#10B981',
    'Mid-level': '#6C63FF',
    'Senior':   '#F59E0B',
    'Lead':     '#EF4444',
    'Principal': '#EC4899',
  };
  return map[level] || '#8888AA';
}

/**
 * Sort perspectives by votes (descending)
 */
export function sortByVotes(perspectives) {
  return [...perspectives].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
}

/**
 * Sort questions by most recent
 */
export function sortByRecent(items) {
  return [...items].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
}

/**
 * Sort questions by perspective count (trending)
 */
export function sortByTrending(questions) {
  return [...questions].sort((a, b) => (b.perspectiveCount || 0) - (a.perspectiveCount || 0));
}

/**
 * Filter questions by search query
 */
export function filterBySearch(items, query) {
  if (!query || !query.trim()) return items;
  const q = query.toLowerCase();
  return items.filter(item =>
    (item.title || '').toLowerCase().includes(q) ||
    (item.context || '').toLowerCase().includes(q)
  );
}

/**
 * Filter questions by topic slug
 */
export function filterByTopic(questions, topicSlug) {
  if (!topicSlug) return questions;
  return questions.filter(q => q.topics && q.topics.includes(topicSlug));
}

/**
 * Storage helpers with JSON parse/stringify
 */
export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch {}
  },
};
