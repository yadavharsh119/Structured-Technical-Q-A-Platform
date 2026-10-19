// Kysely Database interface definition
// Table interfaces for migration 002_auth_core (see database/migrations/002_auth_core.sql)

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

export interface Database {
  _migrations: MigrationTable;
  users: UsersTable;
  oauth_identities: OauthIdentitiesTable;
  sessions: SessionsTable;
  email_verification_tokens: EmailVerificationTokensTable;
  password_reset_tokens: PasswordResetTokensTable;
  login_attempts: LoginAttemptsTable;
  audit_logs: AuditLogsTable;
}

