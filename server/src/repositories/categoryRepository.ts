import { Selectable } from 'kysely';
import { db } from '../config/database';
import { CategoriesTable } from '../types/database';
import type { DbHandle } from './questionRepository';

export type CategoryRow = Selectable<CategoriesTable>;

export type NewCategory = Pick<CategoriesTable, 'name' | 'description' | 'parent_id'>;

export type CategoryUpdate = Partial<Pick<CategoriesTable, 'name' | 'description' | 'parent_id'>> & {
  is_active?: boolean;
};

export const categoryRepository = {
  listActive(): Promise<CategoryRow[]> {
    return db
      .selectFrom('categories')
      .selectAll()
      .where('is_active', '=', true)
      .orderBy('name', 'asc')
      .execute();
  },

  listAll(): Promise<CategoryRow[]> {
    return db.selectFrom('categories').selectAll().orderBy('name', 'asc').execute();
  },

  findById(id: string, dbi: DbHandle = db): Promise<CategoryRow | undefined> {
    return dbi.selectFrom('categories').selectAll().where('id', '=', id).executeTakeFirst();
  },

  findByName(name: string, dbi: DbHandle = db): Promise<CategoryRow | undefined> {
    // categories.name is CITEXT, so this comparison is case-insensitive.
    return dbi.selectFrom('categories').selectAll().where('name', '=', name).executeTakeFirst();
  },

  create(data: NewCategory, dbi: DbHandle = db): Promise<CategoryRow> {
    return dbi.insertInto('categories').values(data).returningAll().executeTakeFirstOrThrow();
  },

  update(id: string, data: CategoryUpdate, dbi: DbHandle = db): Promise<CategoryRow> {
    return dbi
      .updateTable('categories')
      .set(data)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  },
};
