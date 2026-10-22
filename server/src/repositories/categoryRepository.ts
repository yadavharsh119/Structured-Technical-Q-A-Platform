import { Selectable } from 'kysely';
import { db } from '../config/database';
import { CategoriesTable } from '../types/database';

export type CategoryRow = Selectable<CategoriesTable>;

export const categoryRepository = {
  listActive(): Promise<CategoryRow[]> {
    return db.selectFrom('categories').selectAll().where('is_active', '=', true).execute();
  },

  findById(id: string): Promise<CategoryRow | undefined> {
    return db.selectFrom('categories').selectAll().where('id', '=', id).executeTakeFirst();
  },
};
