import { Router } from 'express';
import requireAuth from '../middleware/auth.middleware.js';
import { initiatePayment, mpesaCallback } from '../controllers/mpesa.controller.js';

const router = Router();

router.post('/mpesa/callback', mpesaCallback);
router.post('/mpesa/stk-push', requireAuth, initiatePayment);

export default router;
