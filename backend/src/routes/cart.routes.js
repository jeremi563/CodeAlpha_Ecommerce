import { Router } from 'express';
import * as cartController from '../controllers/cart.controller.js';
import requireAuth from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);
router.get('/', cartController.getCart);
router.post('/', cartController.addItem);
router.patch('/:productId', cartController.updateItem);
router.delete('/:productId', cartController.removeItem);
router.delete('/', cartController.clearCart);

export default router;