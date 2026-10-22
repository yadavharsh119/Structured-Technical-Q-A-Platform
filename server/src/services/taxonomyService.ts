import { categoryRepository } from '../repositories/categoryRepository';
import { tagRepository } from '../repositories/tagRepository';

export interface CategoryDto {
  id: string;
  name: string;
  description: string | null;
}

export interface TagDto {
  id: string;
  name: string;
}

async function listCategories(): Promise<CategoryDto[]> {
  const rows = await categoryRepository.listActive();
  return rows.map((row) => ({ id: row.id, name: row.name, description: row.description }));
}

async function listTags(): Promise<TagDto[]> {
  const rows = await tagRepository.listActive();
  return rows.map((row) => ({ id: row.id, name: row.name }));
}

export const taxonomyService = {
  listCategories,
  listTags,
};
