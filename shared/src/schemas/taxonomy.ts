import { z } from 'zod';
import { uuidSchema } from './questions';

// Category and tag management (FR-TOP-05, FR-TOP-06).

export const CATEGORY_NAME_MAX = 100;
export const CATEGORY_DESCRIPTION_MAX = 1000;
export const TAG_NAME_MAX = 50;

const categoryNameSchema = z
  .string()
  .trim()
  .min(1, 'Category name is required.')
  .max(CATEGORY_NAME_MAX, `Category name must be ${CATEGORY_NAME_MAX} characters or fewer.`);

const categoryDescriptionSchema = z
  .string()
  .trim()
  .max(
    CATEGORY_DESCRIPTION_MAX,
    `Category description must be ${CATEGORY_DESCRIPTION_MAX} characters or fewer.`,
  )
  .nullable();

export const categoryCreateSchema = z.object({
  name: categoryNameSchema,
  description: categoryDescriptionSchema.optional(),
  parentId: uuidSchema.nullable().optional(),
});

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;

export const categoryUpdateSchema = z
  .object({
    name: categoryNameSchema.optional(),
    description: categoryDescriptionSchema.optional(),
    parentId: uuidSchema.nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Provide at least one field to update.',
  });

export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;

const tagNameSchema = z
  .string()
  .trim()
  .min(1, 'Tag name is required.')
  .max(TAG_NAME_MAX, `Tag name must be ${TAG_NAME_MAX} characters or fewer.`);

export const tagCreateSchema = z.object({
  name: tagNameSchema,
});

export type TagCreateInput = z.infer<typeof tagCreateSchema>;

export const tagUpdateSchema = z
  .object({
    name: tagNameSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Provide at least one field to update.',
  });

export type TagUpdateInput = z.infer<typeof tagUpdateSchema>;

export const tagMergeSchema = z
  .object({
    sourceId: uuidSchema,
    destinationId: uuidSchema,
  })
  .refine((data) => data.sourceId !== data.destinationId, {
    message: 'Source and destination tags must be different.',
    path: ['destinationId'],
  });

export type TagMergeInput = z.infer<typeof tagMergeSchema>;
