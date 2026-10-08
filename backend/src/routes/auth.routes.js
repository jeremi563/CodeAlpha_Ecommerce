import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import requireAuth from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', requireAuth, authController.getCurrentUser);

export default router;