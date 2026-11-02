// Kysely Database interface definition
// Table interfaces for migrations 002_auth_core, 003_content_core and
// 004_votes_moderation (see database/migrations/)

import type { Generated } from 'kysely';

export interface MigrationTable {
  id: number;
  name: string;
  executed_at: Date;
}

// Enums (mirror the PostgreSQL types created in 002_auth_core.sql)
export type UserRole = 'registered' | 'moderator' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'banned' | 'deactivated';
export type OAuthProvider = 'google' | 'github';

export interface UsersTable {
  id: Generated<string>;
  full_name: string;
  username: string;
  email: string;
  password_hash: string | null;
  email_verified_at: Date | null;
  role: Generated<UserRole>;
  status: Generated<UserStatus>;
  suspended_until: Date | null;
  profile_picture_url: string | null;
  bio: string | null;
  technical_skills: Generated<string[]>;
  areas_of_interest: Generated<string[]>;
  email_public: Generated<boolean>;
  fingerprint_public: Generated<boolean>;
  failed_login_attempts: Generated<number>;
  locked_until: Date | null;
  last_login_at: Date | null;
  sessions_valid_after: Date | null;
  deactivated_at: Date | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface OauthIdentitiesTable {
  id: Generated<string>;
  user_id: string;
  provider: OAuthProvider;
  provider_user_id: string;
  created_at: Generated<Date>;
}

export interface SessionsTable {
  id: Generated<string>;
  user_id: string;
  token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Generated<Date>;
  last_active_at: Generated<Date>;
  expires_at: Date;
  revoked_at: Date | null;
}

export interface EmailVerificationTokensTable {
  id: Generated<string>;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Generated<Date>;
}

export interface PasswordResetTokensTable {
  id: Generated<string>;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Generated<Date>;
}

export interface LoginAttemptsTable {
  // bigint identity: node-postgres returns int8 as a string
  id: Generated<string>;
  identifier: string;
  ip_address: string | null;
  success: boolean;
  created_at: Generated<Date>;
}

export interface AuditLogsTable {
  // bigint identity: node-postgres returns int8 as a string
  id: Generated<string>;
  created_at: Generated<Date>;
  actor_user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  ip_address: string | null;
  result: 'success' | 'failure';
  metadata: Generated<Record<string, unknown>>;
}

// Enums (mirror the PostgreSQL types created in 003_content_core.sql)
export type QuestionStatus = 'pending' | 'approved' | 'rejected';
export type TopicStatus = 'published' | 'archived' | 'hidden';
export type PerspectiveStatus = 'visible' | 'hidden' | 'deleted';

export interface CategoriesTable {
  id: Generated<string>;
  name: string;
  description: string | null;
  parent_id: string | null;
  is_active: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface TagsTable {
  id: Generated<string>;
  name: string;
  is_active: Generated<boolean>;
  created_at: Generated<Date>;
}

export interface QuestionsTable {
  id: Generated<string>;
  author_id: string;
  title: string;
  description: string;
  category_id: string;
  tech_stack: string | null;
  status: Generated<QuestionStatus>;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  topic_id: string | null;
  flagged: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface QuestionTagsTable {
  question_id: string;
  tag_id: string;
}

export interface TopicsTable {
  id: Generated<string>;
  title: string;
  slug: string;
  description: string;
  category_id: string;
  is_curated: Generated<boolean>;
  status: Generated<TopicStatus>;
  created_by: string;
  merged_into_topic_id: string | null;
  hidden: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  // generated tsvector column (GENERATED ALWAYS ... STORED)
  search_vector: Generated<string>;
}

export interface TopicTagsTable {
  topic_id: string;
  tag_id: string;
}

export interface TopicQuestionsTable {
  question_id: string;
  topic_id: string;
  linked_at: Generated<Date>;
}

export interface TopicSlugRedirectsTable {
  old_slug: string;
  topic_id: string;
  created_at: Generated<Date>;
}

export interface PerspectivesTable {
  id: Generated<string>;
  topic_id: string;
  author_id: string;
  proposed_solution: string;
  explanation: string;
  advantages: string[];
  limitations: string[];
  code_snippets: Generated<Record<string, unknown>[]>;
  reference_urls: Generated<string[]>;
  status: Generated<PerspectiveStatus>;
  flagged: Generated<boolean>;
  hidden: Generated<boolean>;
  deleted_at: Date | null;
  created_at: Generated<Date>;
  // generated tsvector column (GENERATED ALWAYS ... STORED)
  search_vector: Generated<string>;
}

export interface AttachmentsTable {
  id: Generated<string>;
  uploader_id: string;
  question_id: string | null;
  perspective_id: string | null;
  original_name: string;
  stored_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: Generated<Date>;
}

// Enums (mirror the PostgreSQL types created in 004_votes_moderation.sql)
export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type ReportStatus = 'open' | 'under_review' | 'resolved' | 'dismissed';
export type ReportReason = 'spam' | 'abusive' | 'duplicate' | 'misleading' | 'plagiarism' | 'other';
export type ReportTargetType = 'topic' | 'perspective';
export type UserActionType = 'warning' | 'suspend' | 'ban' | 'restore';

export interface PerspectiveVotesTable {
  user_id: string;
  perspective_id: string;
  created_at: Generated<Date>;
}

export interface PerspectiveDeletionRequestsTable {
  id: Generated<string>;
  perspective_id: string;
  requested_by: string;
  reason: string;
  status: Generated<RequestStatus>;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  created_at: Generated<Date>;
}

export interface ReportsTable {
  id: Generated<string>;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  comment: string | null;
  status: Generated<ReportStatus>;
  resolved_by: string | null;
  handled_at: Date | null;
  created_at: Generated<Date>;
}

export interface UserActionsTable {
  id: Generated<string>;
  user_id: string;
  admin_id: string;
  action_type: UserActionType;
  reason: string;
  suspended_until: Date | null;
  created_at: Generated<Date>;
}

export interface ExpertFingerprintsTable {
  user_id: string;
  category_id: string;
  perspective_count: Generated<number>;
  upvote_total: Generated<number>;
  // numeric: node-postgres returns numeric values as strings
  score: Generated<string>;
  rank: Generated<number>;
  calculated_at: Generated<Date>;
}

export interface SystemSettingsTable {
  key: string;
  value: Record<string, unknown>;
  updated_by: string | null;
  updated_at: Generated<Date>;
}

export interface Database {
  _migrations: MigrationTable;
  users: UsersTable;
  oauth_identities: OauthIdentitiesTable;
  sessions: SessionsTable;
  email_verification_tokens: EmailVerificationTokensTable;
  password_reset_tokens: PasswordResetTokensTable;
  login_attempts: LoginAttemptsTable;
  audit_logs: AuditLogsTable;
  categories: CategoriesTable;
  tags: TagsTable;
  questions: QuestionsTable;
  question_tags: QuestionTagsTable;
  topics: TopicsTable;
  topic_tags: TopicTagsTable;
  topic_questions: TopicQuestionsTable;
  topic_slug_redirects: TopicSlugRedirectsTable;
  perspectives: PerspectivesTable;
  attachments: AttachmentsTable;
  perspective_votes: PerspectiveVotesTable;
  perspective_deletion_requests: PerspectiveDeletionRequestsTable;
  reports: ReportsTable;
  user_actions: UserActionsTable;
  expert_fingerprints: ExpertFingerprintsTable;
  system_settings: SystemSettingsTable;
}

