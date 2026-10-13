'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useForm } from '@/hooks/useForm';
import { validatePerspective } from '@/lib/validators';
import Button from '@/components/ui/Button';
import styles from './PerspectiveForm.module.css';

export default function PerspectiveForm({ questionId, onSubmitted }) {
  const { user, showToast } = useAuth();
  const { createPerspective } = useData();

  const { values, errors, submitting, handleChange, handleBlur, handleSubmit } = useForm(
    {
      background: '',
      experience: '',
      whatWorked: '',
      whatDidntWork: '',
      advice: '',
    },
    validatePerspective
  );

  const onSubmit = handleSubmit(async (data) => {
    try {
      await createPerspective(questionId, data, user.id);
      showToast('Your perspective has been shared!', 'success');
      if (onSubmitted) onSubmitted();
    } catch (err) {
      showToast(err.message || 'Error submitting perspective', 'error');
    }
  });

  return (
    <div className={`glass-card ${styles.container}`}>
      <div className={styles.header}>
        <div className={styles.badge}>Structured Submission</div>
        <h3 className={styles.title}>Share Your Practical Perspective</h3>
        <p className={styles.subtitle}>
          Each contributor submits <strong>exactly one perspective</strong>. Please fill out all 5 sections based on your real experience.
        </p>
      </div>

      <form onSubmit={onSubmit} className={styles.form}>
        {/* Section 1: Background */}
        <div className="form-group">
          <label className={styles.sectionLabel}>
            <span className={styles.dot} style={{ backgroundColor: 'var(--color-section-background)' }} />
            1. Your Background & Role Context
          </label>
          <p className={styles.fieldHint}>
            Your role, seniority, company scale, tech stack, or context when you faced this problem.
          </p>
          <textarea
            name="background"
            className={`form-textarea ${errors.background ? 'error' : ''}`}
            placeholder="e.g. Senior Frontend dev at a SaaS scale-up (team of 15 devs, 50k DAU). We were migrating from a legacy auth flow to OAuth/OIDC..."
            value={values.background}
            onChange={handleChange}
            onBlur={handleBlur}
            rows={3}
          />
          <div className="char-counter">{values.background.length}/800 (min 50)</div>
          {errors.background && <span className="form-error">{errors.background}</span>}
        </div>

        {/* Section 2: Experience */}
        <div className="form-group">
          <label className={styles.sectionLabel}>
            <span className={styles.dot} style={{ backgroundColor: 'var(--color-section-experience)' }} />
            2. What Actually Happened (Your Experience)
          </label>
          <p className={styles.fieldHint}>
            Describe the situation, challenge, or project from start to finish.
          </p>
          <textarea
            name="experience"
            className={`form-textarea ${errors.experience ? 'error' : ''}`}
            placeholder="e.g. When we first deployed token rotation in production, we immediately had race condition issues on page refresh across multiple tabs..."
            value={values.experience}
            onChange={handleChange}
            onBlur={handleBlur}
            rows={4}
          />
          <div className="char-counter">{values.experience.length}/1500 (min 80)</div>
          {errors.experience && <span className="form-error">{errors.experience}</span>}
        </div>

        {/* Section 3: What Worked */}
        <div className="form-group">
          <label className={styles.sectionLabel}>
            <span className={styles.dot} style={{ backgroundColor: 'var(--color-section-worked)' }} />
            3. What Worked
          </label>
          <p className={styles.fieldHint}>
            Specific tools, architectural decisions, habits, or solutions that succeeded.
          </p>
          <textarea
            name="whatWorked"
            className={`form-textarea ${errors.whatWorked ? 'error' : ''}`}
            placeholder="e.g. Moving refresh tokens exclusively to HttpOnly cookies and relying on a single lightweight in-memory access token cache..."
            value={values.whatWorked}
            onChange={handleChange}
            onBlur={handleBlur}
            rows={3}
          />
          <div className="char-counter">{values.whatWorked.length}/1000 (min 60)</div>
          {errors.whatWorked && <span className="form-error">{errors.whatWorked}</span>}
        </div>

        {/* Section 4: What Didn't Work */}
        <div className="form-group">
          <label className={styles.sectionLabel}>
            <span className={styles.dot} style={{ backgroundColor: 'var(--color-section-didnt)' }} />
            4. What Didn't Work & Pitfalls to Avoid
          </label>
          <p className={styles.fieldHint}>
            Mistakes made, failed solutions, or traps other devs should steer clear of.
          </p>
          <textarea
            name="whatDidntWork"
            className={`form-textarea ${errors.whatDidntWork ? 'error' : ''}`}
            placeholder="e.g. Trying to roll custom JWT refresh queue logic inside Axios interceptors without handling tab synchronization..."
            value={values.whatDidntWork}
            onChange={handleChange}
            onBlur={handleBlur}
            rows={3}
          />
          <div className="char-counter">{values.whatDidntWork.length}/1000 (min 40)</div>
          {errors.whatDidntWork && <span className="form-error">{errors.whatDidntWork}</span>}
        </div>

        {/* Section 5: Advice */}
        <div className="form-group">
          <label className={styles.sectionLabel}>
            <span className={styles.dot} style={{ backgroundColor: 'var(--color-section-advice)' }} />
            5. Your Direct Advice & Takeaways
          </label>
          <p className={styles.fieldHint}>
            Clear, actionable recommendations for someone dealing with this right now.
          </p>
          <textarea
            name="advice"
            className={`form-textarea ${errors.advice ? 'error' : ''}`}
            placeholder="e.g. Don't build bespoke auth unless strictly required by compliance. Use battle-tested libraries like Auth.js..."
            value={values.advice}
            onChange={handleChange}
            onBlur={handleBlur}
            rows={3}
          />
          <div className="char-counter">{values.advice.length}/800 (min 40)</div>
          {errors.advice && <span className="form-error">{errors.advice}</span>}
        </div>

        <div className={styles.submitArea}>
          <Button type="submit" variant="primary" size="lg" loading={submitting}>
            Publish Perspective
          </Button>
        </div>
      </form>
    </div>
  );
}
