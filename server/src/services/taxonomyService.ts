import type {
  CategoryCreateInput,
  CategoryUpdateInput,
  TagCreateInput,
  TagMergeInput,
  TagUpdateInput,
} from '@structured-qa/shared';
import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import {
  categoryRepository,
  type CategoryRow,
} from '../repositories/categoryRepository';
import { tagRepository, type TagRow } from '../repositories/tagRepository';
import { auditService } from './auditService';

export interface CategoryDto {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
}

export interface TagDto {
  id: string;
  name: string;
  isActive: boolean;
}

export interface TagMergeResult {
  source: TagDto;
  destination: TagDto;
}

function notFound(kind: 'category' | 'tag'): AppError {
  return kind === 'category'
    ? new AppError('Category not found.', 404, 'CATEGORY_NOT_FOUND')
    : new AppError('Tag not found.', 404, 'TAG_NOT_FOUND');
}

function validation(message: string): AppError {
  return new AppError(message, 400, 'VALIDATION_ERROR');
}

function conflict(code: string, message: string): AppError {
  return new AppError(message, 409, code);
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === '23505'
  );
}

function errorCode(err: unknown): string {
  return err instanceof AppError ? err.code : 'INTERNAL_SERVER_ERROR';
}

function toCategoryDto(row: CategoryRow): CategoryDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    parentId: row.parent_id,
    isActive: row.is_active,
  };
}

function toTagDto(row: TagRow): TagDto {
  return { id: row.id, name: row.name, isActive: row.is_active };
}

// Walks up from the proposed parent to reject self-parenting and cycles.
async function assertValidParent(categoryId: string | null, parentId: string | null): Promise<void> {
  if (parentId === null) {
    return;
  }
  if (categoryId !== null && parentId === categoryId) {
    throw validation('A category cannot be its own parent.');
  }

  const seen = new Set<string>();
  let currentId: string | null = parentId;
  while (currentId !== null) {
    if (categoryId !== null && currentId === categoryId) {
      throw validation('A category cannot have a circular parent chain.');
    }
    if (seen.has(currentId)) {
      throw validation('A category cannot have a circular parent chain.');
    }
    seen.add(currentId);

    const current = await categoryRepository.findById(currentId);
    if (!current) {
      throw validation('Parent category not found.');
    }
    currentId = current.parent_id;
  }
}

async function listCategories(): Promise<CategoryDto[]> {
  const rows = await categoryRepository.listActive();
  return rows.map(toCategoryDto);
}

async function listAdminCategories(): Promise<CategoryDto[]> {
  const rows = await categoryRepository.listAll();
  return rows.map(toCategoryDto);
}

async function createCategory(
  input: CategoryCreateInput,
  actorId: string,
  ip?: string,
): Promise<CategoryDto> {
  try {
    const name = input.name.trim();
    const existing = await categoryRepository.findByName(name);
    if (existing) {
      throw conflict('CATEGORY_NAME_EXISTS', 'A category with this name already exists.');
    }

    const parentId = input.parentId ?? null;
    await assertValidParent(null, parentId);

    let row: CategoryRow;
    try {
      row = await categoryRepository.create({
        name,
        description: input.description ?? null,
        parent_id: parentId,
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw conflict('CATEGORY_NAME_EXISTS', 'A category with this name already exists.');
      }
      throw err;
    }

    await auditService.log({
      actorUserId: actorId,
      action: 'category.create',
      targetType: 'category',
      targetId: row.id,
      ip,
      result: 'success',
      metadata: { name: row.name, parentId: row.parent_id },
    });
    return toCategoryDto(row);
  } catch (err) {
    await auditService.log({
      actorUserId: actorId,
      action: 'category.create',
      targetType: 'category',
      ip,
      result: 'failure',
      metadata: { name: input.name, error: errorCode(err) },
    });
    throw err;
  }
}

async function updateCategory(
  categoryId: string,
  input: CategoryUpdateInput,
  actorId: string,
  ip?: string,
): Promise<CategoryDto> {
  try {
    const category = await categoryRepository.findById(categoryId);
    if (!category) {
      throw notFound('category');
    }

    const name = input.name !== undefined ? input.name.trim() : undefined;
    if (name !== undefined && name !== category.name) {
      const sameName = await categoryRepository.findByName(name);
      if (sameName && sameName.id !== categoryId) {
        throw conflict('CATEGORY_NAME_EXISTS', 'A category with this name already exists.');
      }
    }

    if (input.parentId !== undefined) {
      await assertValidParent(categoryId, input.parentId);
    }

    let row: CategoryRow;
    try {
      row = await categoryRepository.update(categoryId, {
        ...(name !== undefined ? { name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.parentId !== undefined ? { parent_id: input.parentId } : {}),
        ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw conflict('CATEGORY_NAME_EXISTS', 'A category with this name already exists.');
      }
      throw err;
    }

    const deactivated = category.is_active && !row.is_active;
    await auditService.log({
      actorUserId: actorId,
      action: deactivated ? 'category.deactivate' : 'category.update',
      targetType: 'category',
      targetId: categoryId,
      ip,
      result: 'success',
      metadata: {
        ...(name !== undefined ? { name } : {}),
        ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
        isActive: row.is_active,
      },
    });
    return toCategoryDto(row);
  } catch (err) {
    await auditService.log({
      actorUserId: actorId,
      action: 'category.update',
      targetType: 'category',
      targetId: categoryId,
      ip,
      result: 'failure',
      metadata: { error: errorCode(err) },
    });
    throw err;
  }
}

async function listTags(): Promise<TagDto[]> {
  const rows = await tagRepository.listActive();
  return rows.map(toTagDto);
}

async function listAdminTags(): Promise<TagDto[]> {
  const rows = await tagRepository.listAll();
  return rows.map(toTagDto);
}

async function createTag(input: TagCreateInput, actorId: string, ip?: string): Promise<TagDto> {
  try {
    const name = input.name.trim();
    const existing = await tagRepository.findByName(name);
    if (existing) {
      throw conflict('TAG_NAME_EXISTS', 'A tag with this name already exists.');
    }

    let row: TagRow;
    try {
      row = await tagRepository.create({ name });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw conflict('TAG_NAME_EXISTS', 'A tag with this name already exists.');
      }
      throw err;
    }

    await auditService.log({
      actorUserId: actorId,
      action: 'tag.create',
      targetType: 'tag',
      targetId: row.id,
      ip,
      result: 'success',
      metadata: { name: row.name },
    });
    return toTagDto(row);
  } catch (err) {
    await auditService.log({
      actorUserId: actorId,
      action: 'tag.create',
      targetType: 'tag',
      ip,
      result: 'failure',
      metadata: { name: input.name, error: errorCode(err) },
    });
    throw err;
  }
}

async function updateTag(
  tagId: string,
  input: TagUpdateInput,
  actorId: string,
  ip?: string,
): Promise<TagDto> {
  try {
    const tag = await tagRepository.findById(tagId);
    if (!tag) {
      throw notFound('tag');
    }

    const name = input.name !== undefined ? input.name.trim() : undefined;
    if (name !== undefined && name !== tag.name) {
      const sameName = await tagRepository.findByName(name);
      if (sameName && sameName.id !== tagId) {
        throw conflict('TAG_NAME_EXISTS', 'A tag with this name already exists.');
      }
    }

    let row: TagRow;
    try {
      row = await tagRepository.update(tagId, {
        ...(name !== undefined ? { name } : {}),
        ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw conflict('TAG_NAME_EXISTS', 'A tag with this name already exists.');
      }
      throw err;
    }

    const deactivated = tag.is_active && !row.is_active;
    await auditService.log({
      actorUserId: actorId,
      action: deactivated ? 'tag.deactivate' : 'tag.update',
      targetType: 'tag',
      targetId: tagId,
      ip,
      result: 'success',
      metadata: { ...(name !== undefined ? { name } : {}), isActive: row.is_active },
    });
    return toTagDto(row);
  } catch (err) {
    await auditService.log({
      actorUserId: actorId,
      action: 'tag.update',
      targetType: 'tag',
      targetId: tagId,
      ip,
      result: 'failure',
      metadata: { error: errorCode(err) },
    });
    throw err;
  }
}

async function mergeTags(
  input: TagMergeInput,
  actorId: string,
  ip?: string,
): Promise<TagMergeResult> {
  const { sourceId, destinationId } = input;

  try {
    return await db.transaction().execute(async (trx) => {
      const source = await tagRepository.findById(sourceId, trx);
      if (!source) {
        throw notFound('tag');
      }
      const destination = await tagRepository.findById(destinationId, trx);
      if (!destination) {
        throw notFound('tag');
      }
      if (sourceId === destinationId) {
        throw validation('Source and destination tags must be different.');
      }

      await tagRepository.moveLinks(sourceId, destinationId, trx);
      const deactivated = await tagRepository.deactivate(sourceId, trx);

      await auditService.log(
        {
          actorUserId: actorId,
          action: 'tag.merge',
          targetType: 'tag',
          targetId: sourceId,
          ip,
          result: 'success',
          metadata: {
            sourceName: source.name,
            destinationId,
            destinationName: destination.name,
          },
        },
        trx,
      );

      return {
        source: toTagDto(deactivated),
        destination: toTagDto(destination),
      };
    });
  } catch (err) {
    await auditService.log({
      actorUserId: actorId,
      action: 'tag.merge',
      targetType: 'tag',
      targetId: sourceId,
      ip,
      result: 'failure',
      metadata: { destinationId, error: errorCode(err) },
    });
    throw err;
  }
}

export const taxonomyService = {
  listCategories,
  listAdminCategories,
  createCategory,
  updateCategory,
  listTags,
  listAdminTags,
  createTag,
  updateTag,
  mergeTags,
};
