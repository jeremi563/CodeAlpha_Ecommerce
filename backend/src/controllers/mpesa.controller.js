import { timingSafeEqual } from 'node:crypto';
import { getMpesaConfig } from '../config/mpesa.js';
import { initiateStkPush, processStkCallback } from '../services/mpesa.service.js';
import { mpesaRequestSchema, parseBody } from '../utils/validators.js';

export async function initiatePayment(req, res) {
  const parsed = parseBody(mpesaRequestSchema, req.body);
  if (parsed.error) {
    return res.status(400).json({ message: parsed.error });
  }

  try {
    const receipt = await initiateStkPush({ ...parsed.data, userId: req.user.sub });
    return res.json(receipt);
  } catch (error) {
    if (error.message === 'ORDER_NOT_FOUND') return res.status(404).json({ message: 'Order not found' });
    if (error.message === 'ORDER_NOT_PAYABLE') return res.status(409).json({ message: 'Order is not awaiting payment' });
    if (error.message.startsWith('M-Pesa is enabled') || error.message.startsWith('MPESA_CALLBACK_')) {
      return res.status(503).json({ message: error.message });
    }
    console.error(error);
    return res.status(500).json({
      message: error.message || 'M-Pesa payment request could not be started',
    });
  }
}

export async function mpesaCallback(req, res) {
  const config = getMpesaConfig();
  const requiresTokenValidation = config.enabled && config.environment !== 'sandbox';

  if (requiresTokenValidation) {
    const expected = Buffer.from(config.callbackToken);
    const supplied = Buffer.from(String(req.query.token || ''));
    if (expected.length < 32 || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      return res.status(401).json({ ResultCode: 1, ResultDesc: 'Unauthorized callback' });
    }
  }

  try {
    await processStkCallback(req.body);
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error) {
    console.error('M-Pesa callback rejected:', error.message);
    return res.status(400).json({ ResultCode: 1, ResultDesc: 'Callback rejected' });
  }
}
