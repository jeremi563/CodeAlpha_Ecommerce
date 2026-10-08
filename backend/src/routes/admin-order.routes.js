import { Router } from 'express';
import * as orderController from '../controllers/order.controller.js';
import requireAdmin from '../middleware/admin.middleware.js';

const router = Router();

router.use(requireAdmin);
router.get('/', orderController.listAllOrders);
router.patch('/:id', orderController.updateOrderStatus);

export default router;