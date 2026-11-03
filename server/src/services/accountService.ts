import argon2 from 'argon2';
import JSZip from 'jszip';
import { randomUUID } from 'crypto';
import type { DeactivateAccountInput } from '@structured-qa/shared';
import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { accountRepository } from '../repositories/accountRepository';
import { userRepository } from '../repositories/userRepository';
import { auditService } from './auditService';

function userNotFound(): AppError {
  return new AppError('User not found.', 404, 'USER_NOT_FOUND');
}

function invalidPassword(): AppError {
  return new AppError('Password is incorrect.', 401, 'INVALID_PASSWORD');
}

function json(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

// FR-PROF-03 / SEC-14: exports are built in memory and contain only the
// requesting user's own records. No credentials, tokens, audit entries or
// other users' details are included.
async function exportData(userId: string): Promise<Buffer> {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw userNotFound();
  }

  const [questionRows, questionTagRows, perspectiveRows, voteRows] = await Promise.all([
    accountRepository.listOwnQuestions(userId),
    accountRepository.listOwnQuestionTags(userId),
    accountRepository.listOwnPerspectives(userId),
    accountRepository.listOwnVotes(userId),
  ]);

  const tagsByQuestion = new Map<string, string[]>();
  for (const row of questionTagRows) {
    const tags = tagsByQuestion.get(row.question_id) ?? [];
    tags.push(row.tag_name);
    tagsByQuestion.set(row.question_id, tags);
  }

  const profile = {
    username: user.username,
    fullName: user.full_name,
    email: user.email,
    bio: user.bio,
    skills: user.technical_skills,
    interests: user.areas_of_interest,
    emailPublic: user.email_public,
    joinedAt: user.created_at,
  };

  const questions = questionRows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category_name,
    techStack: row.tech_stack,
    tags: tagsByQuestion.get(row.id) ?? [],
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const perspectives = perspectiveRows.map((row) => ({
    id: row.id,
    topicId: row.topic_id,
    topicTitle: row.topic_title,
    proposedSolution: row.proposed_solution,
    explanation: row.explanation,
    advantages: row.advantages,
    limitations: row.limitations,
    codeSnippets: row.code_snippets,
    references: row.reference_urls,
    status: row.status,
    createdAt: row.created_at,
  }));

  const votes = voteRows.map((row) => ({
    perspectiveId: row.perspective_id,
    createdAt: row.created_at,
  }));

  const zip = new JSZip();
  zip.file('profile.json', json(profile));
  zip.file('questions.json', json(questions));
  zip.file('perspectives.json', json(perspectives));
  zip.file('votes.json', json(votes));

  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

async function deactivate(userId: string, input: DeactivateAccountInput): Promise<void> {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw userNotFound();
  }
  if (!user.password_hash) {
    throw invalidPassword();
  }

  let passwordOk = false;
  try {
    passwordOk = await argon2.verify(user.password_hash, input.password);
  } catch {
    passwordOk = false;
  }
  if (!passwordOk) {
    throw invalidPassword();
  }

  const now = new Date();
  const shortId = randomUUID().replace(/-/g, '').slice(0, 10);
  const username = `deleted-user-${shortId}`;
  const email = `${username}@deleted.invalid`;

  // FR-PROF-02: all changes run in a single transaction so a failure leaves
  // the account and its sessions untouched.
  await db.transaction().execute(async (trx) => {
    await accountRepository.anonymiseUser(
      userId,
      {
        status: 'deactivated',
        full_name: 'Deactivated User',
        username,
        email,
        password_hash: null,
        bio: null,
        technical_skills: [],
        areas_of_interest: [],
        email_public: false,
        fingerprint_public: false,
        email_verified_at: null,
        deactivated_at: now,
        sessions_valid_after: now,
      },
      trx,
    );
    await accountRepository.deleteOAuthIdentities(userId, trx);
    await accountRepository.deleteEmailVerificationTokens(userId, trx);
    await accountRepository.deletePasswordResetTokens(userId, trx);
    await accountRepository.deleteFingerprints(userId, trx);
    await accountRepository.revokeAllSessions(userId, now, trx);

    await auditService.log(
      {
        actorUserId: userId,
        action: 'account.deactivated',
        targetType: 'user',
        targetId: userId,
        result: 'success',
      },
      trx,
    );
  });
}

export const accountService = {
  exportData,
  deactivate,
};
