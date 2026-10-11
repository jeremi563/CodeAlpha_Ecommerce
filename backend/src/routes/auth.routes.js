import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import requireAuth from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/google/config', authController.googleConfig);
router.post('/google', authController.googleLogin);
router.get('/me', requireAuth, authController.getCurrentUser);
router.patch('/me', requireAuth, authController.updateCurrentUser);

export default router;