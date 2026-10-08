import { Router } from 'express';
import * as productController from '../controllers/product.controller.js';
import requireAdmin from '../middleware/admin.middleware.js';

const router = Router();

router.get('/', productController.listProducts);
router.get('/:id', productController.getProduct);
router.post('/', requireAdmin, productController.createProduct);
router.patch('/:id', requireAdmin, productController.updateProduct);
router.delete('/:id', requireAdmin, productController.deleteProduct);

export default router;