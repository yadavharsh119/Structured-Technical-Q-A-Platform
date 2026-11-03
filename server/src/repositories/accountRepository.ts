import { db } from '../config/database';
import type { UserStatus } from '../types/database';
import type { DbHandle } from './questionRepository';

export interface ExportQuestionRow {
  id: string;
  title: string;
  description: string;
  tech_stack: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
  category_name: string | null;
}

export interface ExportQuestionTagRow {
  question_id: string;
  tag_name: string;
}

export interface ExportPerspectiveRow {
  id: string;
  topic_id: string;
  topic_title: string;
  proposed_solution: string;
  explanation: string;
  advantages: string[];
  limitations: string[];
  code_snippets: Array<{ language: string; code: string }>;
  reference_urls: string[];
  status: string;
  created_at: Date;
}

export interface ExportVoteRow {
  perspective_id: string;
  created_at: Date;
}

export interface AnonymisedUserFields {
  status: UserStatus;
  full_name: string;
  username: string;
  email: string;
  password_hash: null;
  bio: null;
  technical_skills: string[];
  areas_of_interest: string[];
  email_public: false;
  fingerprint_public: false;
  email_verified_at: null;
  deactivated_at: Date;
  sessions_valid_after: Date;
}

// FR-PROF-03 / SEC-14: only rows owned by the requesting user are selected.
export const accountRepository = {
  listOwnQuestions(userId: string): Promise<ExportQuestionRow[]> {
    return db
      .selectFrom('questions')
      .leftJoin('categories', 'categories.id', 'questions.category_id')
      .select([
        'questions.id',
        'questions.title',
        'questions.description',
        'questions.tech_stack',
        'questions.status',
        'questions.created_at',
        'questions.updated_at',
        'categories.name as category_name',
      ])
      .where('questions.author_id', '=', userId)
      .orderBy('questions.created_at', 'asc')
      .execute();
  },

  listOwnQuestionTags(userId: string): Promise<ExportQuestionTagRow[]> {
    return db
      .selectFrom('question_tags')
      .innerJoin('questions', 'questions.id', 'question_tags.question_id')
      .innerJoin('tags', 'tags.id', 'question_tags.tag_id')
      .select(['question_tags.question_id', 'tags.name as tag_name'])
      .where('questions.author_id', '=', userId)
      .orderBy('tags.name', 'asc')
      .execute();
  },

  listOwnPerspectives(userId: string): Promise<ExportPerspectiveRow[]> {
    return db
      .selectFrom('perspectives')
      .innerJoin('topics', 'topics.id', 'perspectives.topic_id')
      .select([
        'perspectives.id',
        'perspectives.topic_id',
        'topics.title as topic_title',
        'perspectives.proposed_solution',
        'perspectives.explanation',
        'perspectives.advantages',
        'perspectives.limitations',
        'perspectives.code_snippets',
        'perspectives.reference_urls',
        'perspectives.status',
        'perspectives.created_at',
      ])
      .where('perspectives.author_id', '=', userId)
      .orderBy('perspectives.created_at', 'asc')
      .execute() as Promise<ExportPerspectiveRow[]>;
  },

  listOwnVotes(userId: string): Promise<ExportVoteRow[]> {
    return db
      .selectFrom('perspective_votes')
      .select(['perspective_id', 'created_at'])
      .where('user_id', '=', userId)
      .orderBy('created_at', 'asc')
      .execute();
  },

  async anonymiseUser(
    userId: string,
    fields: AnonymisedUserFields,
    dbi: DbHandle = db,
  ): Promise<void> {
    await dbi.updateTable('users').set(fields).where('id', '=', userId).execute();
  },

  async deleteOAuthIdentities(userId: string, dbi: DbHandle = db): Promise<void> {
    await dbi.deleteFrom('oauth_identities').where('user_id', '=', userId).execute();
  },

  async deleteEmailVerificationTokens(userId: string, dbi: DbHandle = db): Promise<void> {
    await dbi
      .deleteFrom('email_verification_tokens')
      .where('user_id', '=', userId)
      .execute();
  },

  async deletePasswordResetTokens(userId: string, dbi: DbHandle = db): Promise<void> {
    await dbi.deleteFrom('password_reset_tokens').where('user_id', '=', userId).execute();
  },

  async deleteFingerprints(userId: string, dbi: DbHandle = db): Promise<void> {
    await dbi.deleteFrom('expert_fingerprints').where('user_id', '=', userId).execute();
  },

  async revokeAllSessions(userId: string, revokedAt: Date, dbi: DbHandle = db): Promise<void> {
    await dbi
      .updateTable('sessions')
      .set({ revoked_at: revokedAt })
      .where('user_id', '=', userId)
      .where('revoked_at', 'is', null)
      .execute();
  },
};
