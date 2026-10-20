'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user, showToast } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [perspectives, setPerspectives] = useState([]);
  const [topics, setTopics] = useState([]);
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshAllData = useCallback(async () => {
    try {
      const [qRes, tRes, pRes, vRes] = await Promise.all([
        fetch('/api/questions'),
        fetch('/api/topics'),
        fetch('/api/perspectives'),
        fetch('/api/votes')
      ]);

      if (qRes.ok) {
        const qData = await qRes.json();
        setQuestions(qData.questions || []);
      }
      if (tRes.ok) {
        const tData = await tRes.json();
        setTopics(tData.topics || []);
      }
      if (pRes.ok) {
        const pData = await pRes.json();
        setPerspectives(pData.perspectives || []);
      }
      if (vRes.ok) {
        const vData = await vRes.json();
        setVotes(vData.votes || []);
      }
    } catch (err) {
      console.error('Error loading data from backend:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  const getQuestions = ({ topicSlug, search, sort = 'recent', authorId } = {}) => {
    let result = [...questions];

    if (authorId) {
      result = result.filter(q => q.authorId === authorId);
    }
    if (topicSlug) {
      result = result.filter(q => q.topics?.includes(topicSlug));
    }
    if (search && search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.context.toLowerCase().includes(q) ||
        item.topics.some(t => t.toLowerCase().includes(q))
      );
    }

    if (sort === 'trending') {
      result.sort((a, b) => (b.perspectiveCount || 0) - (a.perspectiveCount || 0));
    } else {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return result;
  };

  const getQuestionById = (id) => {
    return questions.find(q => q.id === id) || null;
  };

  const createQuestion = async (formData, authorId) => {
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, authorId }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to create question');
    }

    await refreshAllData();
    return data.question;
  };

  const getPerspectivesForQuestion = (questionId) => {
    return perspectives
      .filter(p => p.questionId === questionId)
      .sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
  };

  const getPerspectivesByUser = (authorId) => {
    return perspectives
      .filter(p => p.authorId === authorId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  const getUserPerspective = (questionId, authorId) => {
    return perspectives.find(p => p.questionId === questionId && p.authorId === authorId) || null;
  };

  const createPerspective = async (questionId, formData, authorId) => {
    const res = await fetch('/api/perspectives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId, authorId, ...formData }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to submit perspective');
    }

    await refreshAllData();
    return data.perspective;
  };

  const toggleVote = async (perspectiveId, authorId) => {
    if (!user) {
      showToast('Please sign in to upvote perspectives', 'info');
      return { hasVoted: false, upvotes: 0 };
    }

    if (authorId === user.id) {
      showToast('You cannot upvote your own perspective', 'error');
      return { hasVoted: false, upvotes: 0 };
    }

    const res = await fetch('/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ perspectiveId, userId: user.id }),
    });

    const data = await res.json();
    if (!res.ok) {
      showToast(data.message || 'Vote action failed', 'error');
      return { hasVoted: false, upvotes: 0 };
    }

    // Refresh memory states
    setVotes(prev => {
      const exists = prev.some(v => v.perspectiveId === perspectiveId && v.userId === user.id);
      if (exists) {
        return prev.filter(v => !(v.perspectiveId === perspectiveId && v.userId === user.id));
      } else {
        return [...prev, { perspectiveId, userId: user.id }];
      }
    });

    setPerspectives(prev =>
      prev.map(p => p.id === perspectiveId ? { ...p, upvotes: data.upvotes } : p)
    );

    return data;
  };

  const hasVoted = (perspectiveId, userId) => {
    if (!userId) return false;
    return votes.some(v => v.perspectiveId === perspectiveId && v.userId === userId);
  };

  const getTopics = () => topics;

  const getTopicBySlug = (slug) => {
    return topics.find(t => t.slug === slug) || null;
  };

  const getStats = () => {
    return {
      totalQuestions: questions.length,
      totalPerspectives: perspectives.length,
      totalVotes: perspectives.reduce((acc, p) => acc + (p.upvotes || 0), 0),
    };
  };

  return (
    <DataContext.Provider
      value={{
        questions,
        perspectives,
        topics,
        votes,
        loading,
        getQuestions,
        getQuestionById,
        createQuestion,
        getPerspectivesForQuestion,
        getPerspectivesByUser,
        getUserPerspective,
        createPerspective,
        toggleVote,
        hasVoted,
        getTopics,
        getTopicBySlug,
        getStats,
        refreshAllData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
