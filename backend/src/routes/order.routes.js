import { Router } from 'express';
import * as orderController from '../controllers/order.controller.js';
import requireAuth from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);
router.post('/', orderController.createOrder);
router.get('/', orderController.listUserOrders);
router.get('/:id', orderController.getUserOrder);

export default router;