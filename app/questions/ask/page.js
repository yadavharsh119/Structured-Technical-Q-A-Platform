'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useForm } from '@/hooks/useForm';
import { validateQuestion } from '@/lib/validators';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import styles from './page.module.css';

const QUESTION_TYPES = [
  { value: 'Experience-based', label: 'Experience-based', desc: 'Asking for what devs specifically went through and did' },
  { value: 'Comparison', label: 'Comparison', desc: 'Real tradeoffs between two or more technologies/approaches' },
  { value: 'Best Practice', label: 'Best Practice', desc: 'Proven patterns and principles learned the hard way' },
  { value: 'Career advice', label: 'Career advice', desc: 'Navigating growth, transitions, and engineering life' },
];

export default function AskQuestionPage() {
  const { user, isAuthenticated, showToast } = useAuth();
  const { getTopics, createQuestion } = useData();
  const router = useRouter();

  const allTopics = getTopics();
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);

  const { values, errors, submitting, handleChange, handleBlur, handleSubmit, setValue } = useForm(
    { title: '', context: '', type: 'Experience-based' },
    validateQuestion
  );

  if (!isAuthenticated) {
    return (
      <div className={`container ${styles.authPrompt}`}>
        <div className={`glass-card ${styles.authPromptCard}`}>
          <h2>Sign in to ask a question</h2>
          <p>DevPerspective requires an account so contributors can understand who they are advising.</p>
          <div className={styles.authPromptActions}>
            <Link href="/auth/login"><Button variant="primary">Sign In</Button></Link>
            <Link href="/auth/register"><Button variant="secondary">Create Account</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  const toggleTopic = (slug) => {
    setSelectedTopics(prev => {
      const next = prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug];
      setValue('topics', next);
      return next;
    });
  };

  const onSubmit = handleSubmit(async (data) => {
    if (selectedTopics.length === 0) {
      showToast('Please select at least one topic tag', 'error');
      return;
    }

    try {
      const newQ = await createQuestion({ ...data, topics: selectedTopics }, user.id);
      showToast('Question published successfully!', 'success');
      router.push(`/questions/${newQ.id}`);
    } catch (err) {
      showToast(err.message || 'Failed to publish question', 'error');
    }
  });

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.header}>
        <h1 className={styles.title}>Ask a Developer Question</h1>
        <p className={styles.subtitle}>
          DevPerspective questions invite <strong>structured, personal experiences</strong> rather than debates or quick snippets.
        </p>
      </div>

      <div className={styles.layout}>
        <div className={styles.formContainer}>
          <div className={styles.togglePreview}>
            <button
              type="button"
              className={`${styles.modeBtn} ${!previewMode ? styles.modeActive : ''}`}
              onClick={() => setPreviewMode(false)}
            >
              Write
            </button>
            <button
              type="button"
              className={`${styles.modeBtn} ${previewMode ? styles.modeActive : ''}`}
              onClick={() => setPreviewMode(true)}
            >
              Live Preview
            </button>
          </div>

          {!previewMode ? (
            <form onSubmit={onSubmit} className="glass-card" style={{ padding: 'var(--space-6)' }}>
              {/* Question Type */}
              <div className="form-group">
                <label className="form-label">Question Intent / Type</label>
                <div className={styles.typeGrid}>
                  {QUESTION_TYPES.map(t => (
                    <div
                      key={t.value}
                      className={`${styles.typeOption} ${values.type === t.value ? styles.typeSelected : ''}`}
                      onClick={() => setValue('type', t.value)}
                    >
                      <div className={styles.typeName}>{t.label}</div>
                      <div className={styles.typeDesc}>{t.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="form-group">
                <label className="form-label">Question Title</label>
                <input
                  name="title"
                  className={`form-input ${errors.title ? 'error' : ''}`}
                  placeholder="e.g. How do you actually handle authentication in large React apps?"
                  value={values.title}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
                <div className="char-counter">{values.title.length}/200 (min 20)</div>
                {errors.title && <span className="form-error">{errors.title}</span>}
              </div>

              {/* Context */}
              <div className="form-group">
                <label className="form-label">Background & Specific Context</label>
                <textarea
                  name="context"
                  className={`form-textarea ${errors.context ? 'error' : ''}`}
                  style={{ minHeight: '160px' }}
                  placeholder="Explain why you are asking, what solutions or frameworks you've already tried, what scale or constraints you operate under, and what specific insight you're hoping contributors share..."
                  value={values.context}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
                <div className="char-counter">{values.context.length}/2000 (min 50)</div>
                {errors.context && <span className="form-error">{errors.context}</span>}
              </div>

              {/* Topics */}
              <div className="form-group">
                <label className="form-label">Select Topics (up to 5)</label>
                <div className={styles.topicsSelector}>
                  {allTopics.map(t => {
                    const isSelected = selectedTopics.includes(t.slug);
                    return (
                      <button
                        type="button"
                        key={t.id}
                        className={`${styles.topicChip} ${isSelected ? styles.topicChipActive : ''}`}
                        onClick={() => toggleTopic(t.slug)}
                        disabled={!isSelected && selectedTopics.length >= 5}
                      >
                        <span>{t.icon}</span>
                        <span>{t.name}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.topics && <span className="form-error">{errors.topics}</span>}
              </div>

              <div className={styles.formActions}>
                <Button type="submit" variant="primary" size="lg" loading={submitting}>
                  Publish Question
                </Button>
                <Link href="/">
                  <Button type="button" variant="ghost" size="lg">Cancel</Button>
                </Link>
              </div>
            </form>
          ) : (
            <div className={`glass-card ${styles.previewBox}`}>
              <div className={styles.previewBadge}>
                <Badge variant="primary">{values.type}</Badge>
              </div>
              <h2 className={styles.previewTitle}>{values.title || 'Question title will appear here...'}</h2>
              <p className={styles.previewContext}>
                {values.context || 'Context and background information will be rendered here so you can preview the appearance before submitting.'}
              </p>
              <div className={styles.previewTags}>
                {selectedTopics.map(slug => {
                  const t = allTopics.find(top => top.slug === slug);
                  return (
                    <span key={slug} className={styles.tagPreview}>
                      {t?.icon} {t?.name || slug}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Guidelines Sidebar */}
        <div className={styles.guideSidebar}>
          <div className="glass-card" style={{ padding: 'var(--space-5)' }}>
            <h3 className={styles.guideTitle}>💡 Tips for great questions</h3>
            <ul className={styles.guideList}>
              <li><strong>Be specific about constraints:</strong> Team size, traffic volume, or technical stack.</li>
              <li><strong>Focus on decisions & tradeoffs:</strong> Ask about what lived experience revealed over time.</li>
              <li><strong>Avoid generic troubleshooting:</strong> For syntax errors, StackOverflow is better. DevPerspective is for architectural & experiential learning.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
