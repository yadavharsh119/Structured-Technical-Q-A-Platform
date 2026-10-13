'use client';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { timeAgo, truncate } from '@/lib/utils';
import { SEED_TOPICS } from '@/lib/seed';
import styles from './QuestionCard.module.css';

const TYPE_VARIANTS = {
  'Experience-based': 'primary',
  'Comparison':       'info',
  'Best Practice':    'success',
  'Career advice':    'warning',
};

export default function QuestionCard({ question }) {
  const { getUserById } = useAuth();
  const author = getUserById(question.authorId);

  const topicData = question.topics?.map(slug =>
    SEED_TOPICS.find(t => t.slug === slug)
  ).filter(Boolean);

  return (
    <Link href={`/questions/${question.id}`} className={styles.card + ' glass-card'}>
      <div className={styles.top}>
        <div className={styles.meta}>
          {author && (
            <Avatar
              name={author.name}
              color={author.avatarColor}
              initials={author.avatarInitials}
              size="xs"
            />
          )}
          <span className={styles.authorName}>{author?.name || 'Unknown'}</span>
          <span className={styles.dot}>·</span>
          <span className={styles.time}>{timeAgo(question.createdAt)}</span>
        </div>
        <Badge variant={TYPE_VARIANTS[question.type] || 'default'} size="sm">
          {question.type}
        </Badge>
      </div>

      <h2 className={styles.title}>{question.title}</h2>
      <p className={styles.context}>{truncate(question.context, 150)}</p>

      <div className={styles.footer}>
        <div className={styles.topics}>
          {topicData?.map(t => (
            <span key={t.slug} className={styles.topicTag} style={{ borderColor: t.color + '44', color: t.color }}>
              {t.icon} {t.name}
            </span>
          ))}
        </div>

        <div className={styles.stats}>
          <span className={styles.stat} title="Perspectives">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            {question.perspectiveCount ?? 0}
          </span>
        </div>
      </div>
    </Link>
  );
}
