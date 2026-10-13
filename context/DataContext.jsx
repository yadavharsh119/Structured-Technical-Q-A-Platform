'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage, generateId, mockDelay, sortByRecent, sortByTrending } from '@/lib/utils';
import {
  SEED_QUESTIONS, SEED_PERSPECTIVES, SEED_TOPICS, SEED_VOTES,
} from '@/lib/seed';

const DataContext = createContext(null);

const QUESTIONS_KEY    = 'dp_questions';
const PERSPECTIVES_KEY = 'dp_perspectives';
const TOPICS_KEY       = 'dp_topics';
const VOTES_KEY        = 'dp_votes';
const SEEDED_KEY       = 'dp_seeded';

function initData() {
  if (!storage.get(SEEDED_KEY)) {
    storage.set(QUESTIONS_KEY,    SEED_QUESTIONS);
    storage.set(PERSPECTIVES_KEY, SEED_PERSPECTIVES);
    storage.set(TOPICS_KEY,       SEED_TOPICS);
    storage.set(VOTES_KEY,        SEED_VOTES);
    storage.set(SEEDED_KEY,       true);
  }
}

export function DataProvider({ children }) {
  const [questions,    setQuestions]    = useState([]);
  const [perspectives, setPerspectives] = useState([]);
  const [topics,       setTopics]       = useState([]);
  const [votes,        setVotes]        = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    initData();
    setQuestions(   storage.get(QUESTIONS_KEY,    []));
    setPerspectives(storage.get(PERSPECTIVES_KEY, []));
    setTopics(      storage.get(TOPICS_KEY,       []));
    setVotes(       storage.get(VOTES_KEY,        []));
    setLoading(false);
  }, []);

  // ── Persist helpers ──────────────────────────────────────────
  function persist(key, setter, value) {
    storage.set(key, value);
    setter(value);
  }

  // ── Topics ───────────────────────────────────────────────────
  const getTopics = useCallback(() => topics, [topics]);

  const getTopicBySlug = useCallback((slug) =>
    topics.find(t => t.slug === slug) || null,
  [topics]);

  // ── Questions ─────────────────────────────────────────────────
  const getQuestions = useCallback((opts = {}) => {
    let list = [...questions];
    if (opts.topicSlug) list = list.filter(q => q.topics?.includes(opts.topicSlug));
    if (opts.authorId)  list = list.filter(q => q.authorId === opts.authorId);
    if (opts.search) {
      const q = opts.search.toLowerCase();
      list = list.filter(item =>
        item.title.toLowerCase().includes(q) || item.context.toLowerCase().includes(q)
      );
    }
    if (opts.sort === 'trending') return sortByTrending(list);
    return sortByRecent(list);
  }, [questions]);

  const getQuestionById = useCallback((id) =>
    questions.find(q => q.id === id) || null,
  [questions]);

  const createQuestion = useCallback(async (data, authorId) => {
    await mockDelay(400);
    const newQ = {
      id: generateId('q'),
      authorId,
      title: data.title.trim(),
      context: data.context.trim(),
      topics: data.topics,
      type: data.type,
      perspectiveCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isAnswered: false,
    };
    const updated = [newQ, ...questions];
    persist(QUESTIONS_KEY, setQuestions, updated);
    return newQ;
  }, [questions]);

  // ── Perspectives ──────────────────────────────────────────────
  const getPerspectivesForQuestion = useCallback((questionId) =>
    perspectives
      .filter(p => p.questionId === questionId)
      .sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0)),
  [perspectives]);

  const getUserPerspective = useCallback((questionId, userId) =>
    perspectives.find(p => p.questionId === questionId && p.authorId === userId) || null,
  [perspectives]);

  const getPerspectivesByUser = useCallback((userId) =>
    perspectives.filter(p => p.authorId === userId),
  [perspectives]);

  const createPerspective = useCallback(async (questionId, data, authorId) => {
    await mockDelay(500);

    const already = perspectives.find(p => p.questionId === questionId && p.authorId === authorId);
    if (already) throw new Error('You have already shared a perspective on this question');

    const newP = {
      id: generateId('p'),
      questionId,
      authorId,
      background:    data.background.trim(),
      experience:    data.experience.trim(),
      whatWorked:    data.whatWorked.trim(),
      whatDidntWork: data.whatDidntWork.trim(),
      advice:        data.advice.trim(),
      upvotes: 0,
      createdAt: new Date().toISOString(),
    };

    const updatedP = [...perspectives, newP];
    persist(PERSPECTIVES_KEY, setPerspectives, updatedP);

    // Increment perspectiveCount on the question
    const updatedQ = questions.map(q =>
      q.id === questionId
        ? { ...q, perspectiveCount: (q.perspectiveCount || 0) + 1, updatedAt: new Date().toISOString() }
        : q
    );
    persist(QUESTIONS_KEY, setQuestions, updatedQ);

    return newP;
  }, [perspectives, questions]);

  // ── Votes ─────────────────────────────────────────────────────
  const hasVoted = useCallback((perspectiveId, userId) =>
    votes.some(v => v.perspectiveId === perspectiveId && v.userId === userId),
  [votes]);

  const toggleVote = useCallback(async (perspectiveId, userId) => {
    await mockDelay(150);
    const alreadyVoted = votes.some(v => v.perspectiveId === perspectiveId && v.userId === userId);

    let updatedVotes;
    let delta;

    if (alreadyVoted) {
      updatedVotes = votes.filter(v => !(v.perspectiveId === perspectiveId && v.userId === userId));
      delta = -1;
    } else {
      updatedVotes = [...votes, { perspectiveId, userId }];
      delta = 1;
    }

    persist(VOTES_KEY, setVotes, updatedVotes);

    const updatedP = perspectives.map(p =>
      p.id === perspectiveId
        ? { ...p, upvotes: Math.max(0, (p.upvotes || 0) + delta) }
        : p
    );
    persist(PERSPECTIVES_KEY, setPerspectives, updatedP);

    return !alreadyVoted; // returns new state (true = voted)
  }, [votes, perspectives]);

  // ── Stats ────────────────────────────────────────────────────
  const getStats = useCallback(() => ({
    totalQuestions:    questions.length,
    totalPerspectives: perspectives.length,
    totalTopics:       topics.length,
    totalVotes:        votes.length,
  }), [questions, perspectives, topics, votes]);

  return (
    <DataContext.Provider value={{
      loading,
      questions,
      perspectives,
      topics,
      votes,
      getTopics,
      getTopicBySlug,
      getQuestions,
      getQuestionById,
      createQuestion,
      getPerspectivesForQuestion,
      getUserPerspective,
      getPerspectivesByUser,
      createPerspective,
      hasVoted,
      toggleVote,
      getStats,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
