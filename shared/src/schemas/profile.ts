import { z } from 'zod';
import { passwordSchema } from './auth';

// ── Profile management (FR-PROF-01/02) ──────────────────────────────────────

export const PROFILE_BIO_MAX = 500;
export const PROFILE_LIST_MAX = 10;
export const PROFILE_LIST_ITEM_MAX = 30;

const profileListItemSchema = z
  .string()
  .trim()
  .min(1, 'Profile list items cannot be empty.')
  .max(PROFILE_LIST_ITEM_MAX, `Each item must be ${PROFILE_LIST_ITEM_MAX} characters or fewer.`);

const profileListSchema = z
  .array(profileListItemSchema)
  .max(PROFILE_LIST_MAX, `Add up to ${PROFILE_LIST_MAX} items.`);

// Same rules as registerSchema in ./auth.
const profileUsernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters.')
  .max(30, 'Username must be at most 30 characters.')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores.');

const profileFullNameSchema = z
  .string()
  .trim()
  .min(1, 'Full name is required.')
  .max(100, 'Full name must be 100 characters or fewer.');

const profileBioSchema = z
  .string()
  .trim()
  .max(PROFILE_BIO_MAX, `Bio must be ${PROFILE_BIO_MAX} characters or fewer.`)
  .nullable();

// Accept the camelCase API names and their snake_case equivalents.
export const profileUpdateSchema = z.object({
  fullName: profileFullNameSchema.optional(),
  full_name: profileFullNameSchema.optional(),
  username: profileUsernameSchema.optional(),
  bio: profileBioSchema.optional(),
  skills: profileListSchema.optional(),
  technicalSkills: profileListSchema.optional(),
  technical_skills: profileListSchema.optional(),
  interests: profileListSchema.optional(),
  areasOfInterest: profileListSchema.optional(),
  areas_of_interest: profileListSchema.optional(),
  emailPublic: z.boolean().optional(),
  email_public: z.boolean().optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: passwordSchema,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ── Account data export and deactivation (FR-PROF-02/03, SEC-14) ────────────

export const deactivateAccountSchema = z.object({
  password: z.string().min(1, 'Password is required.'),
  confirm: z.literal(true, {
    errorMap: () => ({ message: 'Please confirm account deactivation.' }),
  }),
});

export type DeactivateAccountInput = z.infer<typeof deactivateAccountSchema>;
