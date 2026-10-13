'use client';
import { useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import VoteButton from '@/components/ui/VoteButton';
import { timeAgo, expLevelColor } from '@/lib/utils';
import styles from './PerspectiveCard.module.css';

export default function PerspectiveCard({ perspective, author, isOwn = false }) {
  const [expanded, setExpanded] = useState(true);

  const sections = [
    { key: 'background', title: 'Background & Stance', color: 'var(--color-section-background)', text: perspective.background },
    { key: 'experience', title: 'What Actually Happened (Experience)', color: 'var(--color-section-experience)', text: perspective.experience },
    { key: 'whatWorked', title: 'What Worked', color: 'var(--color-section-worked)', text: perspective.whatWorked },
    { key: 'whatDidntWork', title: "What Didn't Work & Pitfalls", color: 'var(--color-section-didnt)', text: perspective.whatDidntWork },
    { key: 'advice', title: 'Direct Advice & Takeaway', color: 'var(--color-section-advice)', text: perspective.advice },
  ];

  return (
    <div className={`glass-card ${styles.card} ${isOwn ? styles.ownPerspective : ''}`}>
      <div className={styles.topBar}>
        <div className={styles.authorRow}>
          <Avatar
            name={author?.name || 'Developer'}
            color={author?.avatarColor}
            initials={author?.avatarInitials}
            size="md"
          />
          <div className={styles.authorMeta}>
            <div className={styles.nameRow}>
              <span className={styles.authorName}>{author?.name || 'Anonymous Contributor'}</span>
              {author?.experienceLevel && (
                <Badge
                  style={{
                    backgroundColor: `${expLevelColor(author.experienceLevel)}18`,
                    color: expLevelColor(author.experienceLevel),
                    border: `1px solid ${expLevelColor(author.experienceLevel)}44`
                  }}
                  size="sm"
                >
                  {author.experienceLevel} {author.yearsExp ? `(${author.yearsExp}y)` : ''}
                </Badge>
              )}
              {isOwn && <Badge variant="info" size="sm">Your Perspective</Badge>}
            </div>
            <div className={styles.authorSub}>
              <span>@{author?.username || 'user'}</span>
              <span>·</span>
              <span>{timeAgo(perspective.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className={styles.voteArea}>
          <VoteButton
            perspectiveId={perspective.id}
            authorId={perspective.authorId}
            initialCount={perspective.upvotes || 0}
          />
        </div>
      </div>

      <div className={styles.body}>
        {sections.map(sec => (
          <div key={sec.key} className={styles.sectionBlock}>
            <div className={styles.sectionHeader} style={{ borderLeftColor: sec.color }}>
              <span className={styles.sectionDot} style={{ backgroundColor: sec.color }} />
              <h4 className={styles.sectionHeading}>{sec.title}</h4>
            </div>
            <p className={styles.sectionContent}>{sec.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
