'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import QuestionCard from '@/components/questions/QuestionCard';
import PerspectiveCard from '@/components/perspectives/PerspectiveCard';
import { formatDate, expLevelColor } from '@/lib/utils';
import styles from './page.module.css';

export default function ProfilePage() {
  const { username } = useParams();
  const { user: currentUser, getUserByUsername, updateProfile, showToast } = useAuth();
  const { getQuestions, getPerspectivesByUser, getQuestionById } = useData();

  const [activeTab, setActiveTab] = useState('perspectives');
  const [isEditing, setIsEditing] = useState(false);
  const [bioInput, setBioInput] = useState('');

  const profileUser = getUserByUsername(username);

  if (!profileUser) {
    return (
      <div className={`container ${styles.notFound}`}>
        <h2>User not found</h2>
        <p>No contributor found with the username @{username}</p>
        <Link href="/"><Button variant="primary">Return Home</Button></Link>
      </div>
    );
  }

  const isMe = currentUser?.id === profileUser.id;
  const userQuestions = getQuestions({ authorId: profileUser.id });
  const userPerspectives = getPerspectivesByUser(profileUser.id);

  const handleSaveBio = async () => {
    try {
      await updateProfile({ bio: bioInput });
      setIsEditing(false);
      showToast('Profile updated!', 'success');
    } catch (err) {
      showToast('Failed to update profile', 'error');
    }
  };

  return (
    <div className={`container ${styles.page}`}>
      {/* Profile Header */}
      <div className={`glass-card ${styles.profileCard}`}>
        <div className={styles.headerTop}>
          <div className={styles.avatarWrap}>
            <Avatar
              name={profileUser.name}
              color={profileUser.avatarColor}
              initials={profileUser.avatarInitials}
              size="xl"
            />
          </div>

          <div className={styles.mainInfo}>
            <div className={styles.nameRow}>
              <h1 className={styles.fullName}>{profileUser.name}</h1>
              <span className={styles.handle}>@{profileUser.username}</span>
              {profileUser.experienceLevel && (
                <Badge
                  style={{
                    backgroundColor: `${expLevelColor(profileUser.experienceLevel)}18`,
                    color: expLevelColor(profileUser.experienceLevel),
                    border: `1px solid ${expLevelColor(profileUser.experienceLevel)}44`
                  }}
                  size="sm"
                >
                  {profileUser.experienceLevel} {profileUser.yearsExp ? `· ${profileUser.yearsExp} yrs exp` : ''}
                </Badge>
              )}
            </div>

            {/* Bio */}
            {isEditing ? (
              <div className={styles.bioEditor}>
                <textarea
                  className="form-textarea"
                  value={bioInput}
                  onChange={e => setBioInput(e.target.value)}
                  rows={3}
                />
                <div className={styles.bioButtons}>
                  <Button variant="primary" size="sm" onClick={handleSaveBio}>Save</Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <p className={styles.bioText}>
                {profileUser.bio || 'No bio provided yet.'}
              </p>
            )}

            {/* Skills */}
            {profileUser.skills && profileUser.skills.length > 0 && (
              <div className={styles.skillsList}>
                {profileUser.skills.map(skill => (
                  <span key={skill} className={styles.skillTag}>{skill}</span>
                ))}
              </div>
            )}

            <div className={styles.metaInfo}>
              <span>Joined {formatDate(profileUser.joinedAt)}</span>
            </div>
          </div>

          {isMe && !isEditing && (
            <div className={styles.actionCol}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setBioInput(profileUser.bio || '');
                  setIsEditing(true);
                }}
              >
                Edit Bio
              </Button>
            </div>
          )}
        </div>

        {/* Stats Strip */}
        <div className={styles.statsStrip}>
          <div className={styles.statBox}>
            <span className={styles.statNumber}>{userPerspectives.length}</span>
            <span className={styles.statLabel}>Perspectives Contributed</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statNumber}>{userQuestions.length}</span>
            <span className={styles.statLabel}>Questions Asked</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statNumber}>
              {userPerspectives.reduce((acc, p) => acc + (p.upvotes || 0), 0)}
            </span>
            <span className={styles.statLabel}>Total Upvotes Received</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabsNav}>
        <button
          className={`${styles.tabItem} ${activeTab === 'perspectives' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('perspectives')}
        >
          Perspectives ({userPerspectives.length})
        </button>
        <button
          className={`${styles.tabItem} ${activeTab === 'questions' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          Questions ({userQuestions.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === 'perspectives' && (
          <div className={styles.perspectivesList}>
            {userPerspectives.length === 0 ? (
              <div className="empty-state">
                <p>No perspectives contributed yet.</p>
              </div>
            ) : (
              userPerspectives.map(p => {
                const targetQ = getQuestionById(p.questionId);
                return (
                  <div key={p.id} className={styles.perspectiveWrap}>
                    {targetQ && (
                      <Link href={`/questions/${targetQ.id}`} className={styles.questionBanner}>
                        <span>Question: </span>
                        <strong>{targetQ.title}</strong>
                      </Link>
                    )}
                    <PerspectiveCard
                      perspective={p}
                      author={profileUser}
                      isOwn={isMe}
                    />
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'questions' && (
          <div className={styles.questionsList}>
            {userQuestions.length === 0 ? (
              <div className="empty-state">
                <p>No questions asked yet.</p>
              </div>
            ) : (
              userQuestions.map(q => (
                <QuestionCard key={q.id} question={q} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
