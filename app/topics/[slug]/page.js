'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useData } from '@/context/DataContext';
import QuestionCard from '@/components/questions/QuestionCard';
import Button from '@/components/ui/Button';
import styles from './page.module.css';

export default function TopicDetailPage() {
  const { slug } = useParams();
  const { getTopicBySlug, getQuestions } = useData();
  const topic     = getTopicBySlug(slug);
  const questions = getQuestions({ topicSlug: slug });

  if (!topic) return (
    <div className="empty-state container" style={{paddingTop:'var(--space-16)'}}>
      <div className="empty-icon">🏷️</div>
      <p>Topic not found</p>
      <Link href="/topics"><Button variant="secondary">Browse Topics</Button></Link>
    </div>
  );

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.topicHeader} style={{ '--topic-color': topic.color }}>
        <div className={styles.topicIcon}>{topic.icon}</div>
        <div>
          <h1 className={styles.topicName}>{topic.name}</h1>
          <p className={styles.topicDesc}>{topic.description}</p>
        </div>
        <Link href="/questions/ask" className={styles.askBtn}>
          <Button variant="primary">+ Ask about {topic.name}</Button>
        </Link>
      </div>

      <div className={styles.questionsSection}>
        <h2 className={styles.sectionTitle}>{questions.length} question{questions.length !== 1 ? 's' : ''} about {topic.name}</h2>
        {questions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">{topic.icon}</div>
            <p>No questions yet for this topic</p>
            <Link href="/questions/ask"><Button variant="primary">Be the first to ask</Button></Link>
          </div>
        ) : (
          <div className={styles.list + ' stagger'}>
            {questions.map(q => <QuestionCard key={q.id} question={q} />)}
          </div>
        )}
      </div>
    </div>
  );
}
