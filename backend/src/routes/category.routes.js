import { Router } from 'express';
import * as categoryController from '../controllers/category.controller.js';
import requireAdmin from '../middleware/admin.middleware.js';

const router = Router();

router.get('/', categoryController.listCategories);
router.post('/', requireAdmin, categoryController.createCategory);
router.patch('/:id', requireAdmin, categoryController.updateCategory);
router.delete('/:id', requireAdmin, categoryController.deleteCategory);

export default router;