'use client';
import Link from 'next/link';
import { useData } from '@/context/DataContext';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const { getTopics, getStats } = useData();
  const topics = getTopics().slice(0, 8);
  const stats  = getStats();

  return (
    <aside className={styles.sidebar}>
      {/* Stats */}
      <div className={`glass-card ${styles.card}`}>
        <h3 className={styles.cardTitle}>Platform Stats</h3>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statNum}>{stats.totalQuestions}</span>
            <span className={styles.statLabel}>Questions</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNum}>{stats.totalPerspectives}</span>
            <span className={styles.statLabel}>Perspectives</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNum}>{stats.totalVotes}</span>
            <span className={styles.statLabel}>Upvotes</span>
          </div>
        </div>
      </div>

      {/* Popular Topics */}
      <div className={`glass-card ${styles.card}`}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Topics</h3>
          <Link href="/topics" className={styles.seeAll}>See all →</Link>
        </div>
        <div className={styles.topicsList}>
          {topics.map(topic => (
            <Link key={topic.id} href={`/topics/${topic.slug}`} className={styles.topicItem}>
              <span className={styles.topicIcon}>{topic.icon}</span>
              <span className={styles.topicName}>{topic.name}</span>
              <span className={styles.topicCount}>{topic.questionCount}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className={`glass-card ${styles.card}`}>
        <h3 className={styles.cardTitle}>How It Works</h3>
        <ol className={styles.howList}>
          <li className={styles.howItem}>
            <span className={styles.howNum}>1</span>
            <span>Browse or search developer questions</span>
          </li>
          <li className={styles.howItem}>
            <span className={styles.howNum}>2</span>
            <span>Read structured perspectives from real devs</span>
          </li>
          <li className={styles.howItem}>
            <span className={styles.howNum}>3</span>
            <span>Share your own experience (one per question)</span>
          </li>
          <li className={styles.howItem}>
            <span className={styles.howNum}>4</span>
            <span>Upvote the perspectives that helped you most</span>
          </li>
        </ol>
      </div>
    </aside>
  );
}
