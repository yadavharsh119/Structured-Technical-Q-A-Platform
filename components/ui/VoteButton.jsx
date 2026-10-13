'use client';
import { useState, useCallback } from 'react';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import styles from './VoteButton.module.css';

export default function VoteButton({ perspectiveId, authorId, initialCount = 0 }) {
  const { user, showToast }   = useAuth();
  const { hasVoted, toggleVote } = useData();
  const [count,  setCount]    = useState(initialCount);
  const [voted,  setVoted]    = useState(() => user ? hasVoted(perspectiveId, user.id) : false);
  const [popping, setPopping] = useState(false);
  const [busy,    setBusy]    = useState(false);

  const isOwn = user && authorId === user.id;

  const handleVote = useCallback(async () => {
    if (!user) { showToast('Sign in to upvote perspectives', 'info'); return; }
    if (isOwn)  { showToast("You can't vote on your own perspective", 'info'); return; }
    if (busy)   return;

    setBusy(true);
    setPopping(true);
    setTimeout(() => setPopping(false), 400);

    try {
      const nowVoted = await toggleVote(perspectiveId, user.id);
      setVoted(nowVoted);
      setCount(c => nowVoted ? c + 1 : Math.max(0, c - 1));
    } catch (err) {
      showToast('Could not update vote', 'error');
    } finally {
      setBusy(false);
    }
  }, [user, isOwn, busy, perspectiveId, toggleVote, showToast]);

  return (
    <button
      className={[
        styles.voteBtn,
        voted ? styles.voted : '',
        isOwn ? styles.own : '',
        popping ? styles.pop : '',
      ].filter(Boolean).join(' ')}
      onClick={handleVote}
      disabled={busy || isOwn}
      title={isOwn ? 'Your perspective' : voted ? 'Remove upvote' : 'Upvote this perspective'}
      aria-label={`${count} upvotes`}
    >
      <svg className={styles.icon} viewBox="0 0 24 24" fill={voted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className={styles.count}>{count}</span>
    </button>
  );
}
