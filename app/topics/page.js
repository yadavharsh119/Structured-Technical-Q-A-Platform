'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useData } from '@/context/DataContext';
import styles from './page.module.css';

export default function TopicsPage() {
  const { getTopics } = useData();
  const [search, setSearch] = useState('');
  const topics = getTopics().filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Topics</h1>
          <p className={styles.subtitle}>Browse developer knowledge by topic</p>
        </div>
        <input
          className={`form-input ${styles.search}`}
          placeholder="Search topics…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.grid}>
        {topics.map(topic => (
          <Link key={topic.id} href={`/topics/${topic.slug}`} className={`glass-card ${styles.card}`}>
            <div className={styles.cardTop}>
              <span className={styles.icon}>{topic.icon}</span>
              <span className={styles.count}>{topic.questionCount} questions</span>
            </div>
            <h2 className={styles.cardName} style={{ color: topic.color }}>{topic.name}</h2>
            <p className={styles.cardDesc}>{topic.description}</p>
            <div className={styles.cardFooter}>
              <span className={styles.explore}>Explore →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
