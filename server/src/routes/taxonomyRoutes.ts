import { Router } from 'express';
import { listCategories, listTags } from '../controllers/taxonomyController';

// Public taxonomy listings (FR-QST-01)
export const categoryRoutes = Router();
categoryRoutes.get('/', listCategories);

export const tagRoutes = Router();
tagRoutes.get('/', listTags);
