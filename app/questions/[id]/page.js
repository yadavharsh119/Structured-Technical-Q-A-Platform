'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import PerspectiveCard from '@/components/perspectives/PerspectiveCard';
import PerspectiveForm from '@/components/perspectives/PerspectiveForm';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { timeAgo, expLevelColor } from '@/lib/utils';
import { SEED_TOPICS } from '@/lib/seed';
import styles from './page.module.css';

export default function QuestionDetailPage() {
  const { id } = useParams();
  const { user, getUserById, isAuthenticated } = useAuth();
  const {
    getQuestionById,
    getPerspectivesForQuestion,
    getUserPerspective,
    getQuestions,
  } = useData();

  const [showForm, setShowForm] = useState(false);

  const question = getQuestionById(id);

  if (!question) {
    return (
      <div className={`container ${styles.notFound}`}>
        <h2>Question not found</h2>
        <p>The question you are looking for does not exist or has been removed.</p>
        <Link href="/"><Button variant="primary">Return Home</Button></Link>
      </div>
    );
  }

  const author = getUserById(question.authorId);
  const perspectives = getPerspectivesForQuestion(question.id);
  const myPerspective = user ? getUserPerspective(question.id, user.id) : null;
  const relatedQuestions = getQuestions({ topicSlug: question.topics?.[0] })
    .filter(q => q.id !== question.id)
    .slice(0, 3);

  const topicData = question.topics?.map(slug =>
    SEED_TOPICS.find(t => t.slug === slug)
  ).filter(Boolean);

  return (
    <div className={`container ${styles.page}`}>
      {/* Question Header Card */}
      <div className={`glass-card ${styles.questionHeader}`}>
        <div className={styles.metaRow}>
          <div className={styles.authorGroup}>
            <Avatar
              name={author?.name || 'User'}
              color={author?.avatarColor}
              initials={author?.avatarInitials}
              size="md"
            />
            <div>
              <div className={styles.authorNameRow}>
                <span className={styles.authorName}>{author?.name || 'Anonymous Dev'}</span>
                {author?.experienceLevel && (
                  <Badge
                    style={{
                      backgroundColor: `${expLevelColor(author.experienceLevel)}18`,
                      color: expLevelColor(author.experienceLevel),
                      border: `1px solid ${expLevelColor(author.experienceLevel)}44`
                    }}
                    size="sm"
                  >
                    {author.experienceLevel}
                  </Badge>
                )}
              </div>
              <div className={styles.questionDate}>
                Asked {timeAgo(question.createdAt)}
              </div>
            </div>
          </div>
          <Badge variant="primary" size="md">{question.type}</Badge>
        </div>

        <h1 className={styles.title}>{question.title}</h1>
        <p className={styles.context}>{question.context}</p>

        <div className={styles.topicsRow}>
          {topicData?.map(t => (
            <Link key={t.slug} href={`/topics/${t.slug}`} className={styles.topicTag} style={{ color: t.color, borderColor: `${t.color}44` }}>
              <span>{t.icon}</span> {t.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Action Bar */}
      <div className={styles.actionBar}>
        <div className={styles.perspectiveCount}>
          <h3>
            {perspectives.length} Structured Perspective{perspectives.length !== 1 ? 's' : ''}
          </h3>
          <span className={styles.subtext}>Ranked by community upvotes</span>
        </div>

        <div>
          {isAuthenticated ? (
            myPerspective ? (
              <Badge variant="success" size="md">✓ You contributed a perspective</Badge>
            ) : (
              <Button
                variant="primary"
                onClick={() => setShowForm(prev => !prev)}
              >
                {showForm ? 'Cancel Submission' : '+ Share Your Perspective'}
              </Button>
            )
          ) : (
            <Link href="/auth/login">
              <Button variant="secondary">Sign in to contribute</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Perspective Submission Form */}
      {showForm && !myPerspective && (
        <PerspectiveForm
          questionId={question.id}
          onSubmitted={() => setShowForm(false)}
        />
      )}

      {/* Perspectives List */}
      <div className={styles.perspectivesList}>
        {perspectives.length === 0 ? (
          <div className="empty-state glass-card" style={{ padding: 'var(--space-12)' }}>
            <div className="empty-icon">💬</div>
            <p>No perspectives shared yet.</p>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              Be the first engineer to provide your real story and advice!
            </span>
            {isAuthenticated && !myPerspective && (
              <Button
                variant="primary"
                style={{ marginTop: 'var(--space-4)' }}
                onClick={() => setShowForm(true)}
              >
                Share First Perspective
              </Button>
            )}
          </div>
        ) : (
          perspectives.map(p => {
            const pAuthor = getUserById(p.authorId);
            return (
              <PerspectiveCard
                key={p.id}
                perspective={p}
                author={pAuthor}
                isOwn={user?.id === p.authorId}
              />
            );
          })
        )}
      </div>

      {/* Related Questions Footer */}
      {relatedQuestions.length > 0 && (
        <div className={styles.relatedSection}>
          <h3 className={styles.relatedTitle}>Related Questions</h3>
          <div className={styles.relatedGrid}>
            {relatedQuestions.map(rq => (
              <Link key={rq.id} href={`/questions/${rq.id}`} className={`glass-card ${styles.relatedCard}`}>
                <h4 className={styles.relatedCardTitle}>{rq.title}</h4>
                <div className={styles.relatedMeta}>
                  <span>{rq.perspectiveCount || 0} perspectives</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
