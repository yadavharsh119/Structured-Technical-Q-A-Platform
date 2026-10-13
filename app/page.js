'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import QuestionCard from '@/components/questions/QuestionCard';
import Sidebar from '@/components/layout/Sidebar';
import Button from '@/components/ui/Button';
import SearchBar from '@/components/ui/SearchBar';
import styles from './page.module.css';

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const { getQuestions, loading }  = useData();
  const [search, setSearch]  = useState('');
  const [sort,   setSort]    = useState('recent');

  const questions = getQuestions({ search, sort });

  if (loading) return (
    <div className="loading-overlay">
      <div className="spinner lg" />
    </div>
  );

  return (
    <div className={styles.page}>
      {/* Hero — unauthenticated */}
      {!isAuthenticated && (
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroBadge}>◈ Structured Developer Knowledge</div>
            <h1 className={styles.heroTitle}>
              Real experiences.<br/>
              <span className="text-gradient">No noise.</span>
            </h1>
            <p className={styles.heroSub}>
              One structured perspective per developer per question.
              Compare real experiences from devs who&apos;ve been there — not debate threads.
            </p>
            <div className={styles.heroActions}>
              <Link href="/auth/register">
                <Button variant="primary" size="lg">Join Free — Share Your Perspective</Button>
              </Link>
              <Link href="/topics">
                <Button variant="secondary" size="lg">Browse Topics</Button>
              </Link>
            </div>
            <div className={styles.heroStats}>
              <div className={styles.heroStat}><strong>10+</strong> Questions</div>
              <div className={styles.heroDot} />
              <div className={styles.heroStat}><strong>11+</strong> Perspectives</div>
              <div className={styles.heroDot} />
              <div className={styles.heroStat}><strong>5</strong> Developers</div>
            </div>
          </div>
        </section>
      )}

      {/* Feed */}
      <div className={`container ${styles.feedWrap}`}>
        {/* Authenticated greeting */}
        {isAuthenticated && (
          <div className={styles.greeting}>
            <div>
              <h2 className={styles.greetingTitle}>Welcome back, {user.name.split(' ')[0]} 👋</h2>
              <p className={styles.greetingText}>Browse questions and share your experience.</p>
            </div>
            <Link href="/questions/ask">
              <Button variant="primary">+ Ask Question</Button>
            </Link>
          </div>
        )}

        <div className={styles.layout}>
          {/* Main Feed */}
          <div>
            {/* Controls */}
            <div className={styles.feedControls}>
              <div className={styles.mobileSearch}>
                <SearchBar onSearch={setSearch} placeholder="Search questions…" />
              </div>
              <div className={styles.sortBtns}>
                <button
                  className={[styles.sortBtn, sort === 'recent' ? styles.sortActive : ''].join(' ')}
                  onClick={() => setSort('recent')}
                >
                  🕒 Recent
                </button>
                <button
                  className={[styles.sortBtn, sort === 'trending' ? styles.sortActive : ''].join(' ')}
                  onClick={() => setSort('trending')}
                >
                  🔥 Trending
                </button>
              </div>
            </div>

            {/* Question List */}
            {questions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <p>No questions match your search</p>
                <Button variant="ghost" onClick={() => setSearch('')}>Clear search</Button>
              </div>
            ) : (
              <div className={styles.questionList + ' stagger'}>
                {questions.map((q, i) => (
                  <div key={q.id} style={{ animationDelay: `${i * 50}ms` }}>
                    <QuestionCard question={q} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="sidebar-sticky">
            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
