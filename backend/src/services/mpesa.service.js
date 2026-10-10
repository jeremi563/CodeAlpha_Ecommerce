import axios from 'axios';
import { randomUUID } from 'node:crypto';

import { getMpesaBaseUrl, getMpesaCallbackUrl, getMpesaConfig, hasCallbackToken, hasPublicCallbackUrl, isMpesaConfigured, normalizePhoneNumber } from '../config/mpesa.js';
import prisma from '../config/prisma.js';

const TOKEN_TTL_MS = 55 * 60 * 1000;
let mpesaTokenCache = { token: null, expiresAt: 0 };

function toTimestamp(date = new Date()) {
  return new Date(date).toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
}

function buildPassword(shortCode, passKey, timestamp) {
  return Buffer.from(`${shortCode}${passKey}${timestamp}`).toString('base64');
}

function normalizeRequestAmount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return Math.round(numeric);
}

async function getAccessToken() {
  const config = getMpesaConfig();
  if (!isMpesaConfigured()) {
    return null;
  }

  const now = Date.now();
  if (mpesaTokenCache.token && now < mpesaTokenCache.expiresAt) {
    return mpesaTokenCache.token;
  }

  const response = await axios.get(`${getMpesaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    auth: {
      username: config.consumerKey,
      password: config.consumerSecret,
    },
    timeout: 10000,
  });

  const token = response.data?.access_token;
  if (!token) {
    throw new Error('M-Pesa credentials did not return an access token');
  }

  const expiresIn = Number(response.data?.expires_in || 3600);
  mpesaTokenCache = {
    token,
    expiresAt: now + Math.max(0, expiresIn - 60) * 1000,
  };

  return token;
}

export async function initiateStkPush({ userId, orderId, phone, amount, accountReference, transactionDesc }) {
  const normalizedPhone = normalizePhoneNumber(phone);
  const config = getMpesaConfig();

  if (!normalizedPhone) {
    throw new Error('phone number is required');
  }

  if (!config.enabled) {
    const amountValue = normalizeRequestAmount(amount);
    if (amountValue === null) {
      throw new Error('amount must be a positive number');
    }
    return {
      status: 'PENDING',
      checkoutRequestId: `SIM-${randomUUID()}`,
      merchantRequestId: `SIM-${randomUUID()}`,
      customerMessage: 'M-Pesa is disabled. No live request was sent.',
      phone: normalizedPhone,
      amount: amountValue,
      accountReference: String(accountReference || 'NEXORA'),
      transactionDesc: String(transactionDesc || 'Nexora Store purchase'),
      mode: 'disabled',
    };
  }

  if (!isMpesaConfigured()) {
    throw new Error('M-Pesa is enabled but its credentials are incomplete');
  }
  if (!hasPublicCallbackUrl()) {
    throw new Error('MPESA_CALLBACK_URL must be a public HTTPS URL');
  }
  if (config.environment === 'production' && !hasCallbackToken()) {
    throw new Error('MPESA_CALLBACK_TOKEN must contain at least 32 characters');
  }
  if (!userId || !orderId) {
    throw new Error('An order is required for an M-Pesa payment');
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    select: { id: true, total: true, status: true },
  });
  if (!order) throw new Error('ORDER_NOT_FOUND');
  if (order.status !== 'PENDING') throw new Error('ORDER_NOT_PAYABLE');

  const requestAmount = normalizeRequestAmount(order.total ?? amount);
  if (requestAmount === null) {
    throw new Error('amount must be a positive number');
  }

  const timestamp = toTimestamp();
  const password = buildPassword(config.shortCode, config.passKey, timestamp);
  const token = await getAccessToken();

  if (!token) {
    throw new Error('M-Pesa credentials are not configured');
  }

  const resolvedAccountReference = String(accountReference || order.id.replaceAll('-', '').slice(0, 12)).slice(0, 12);
  const response = await axios.post(
    `${getMpesaBaseUrl()}/mpesa/stkpush/v1/processrequest`,
    {
      BusinessShortCode: config.shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: requestAmount,
      PartyA: normalizedPhone,
      PartyB: config.shortCode,
      PhoneNumber: normalizedPhone,
      CallBackURL: getMpesaCallbackUrl(),
      AccountReference: resolvedAccountReference,
      TransactionDesc: String(transactionDesc || 'Nexora Store purchase'),
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    },
  );

  const checkoutRequestId = response.data?.CheckoutRequestID ?? response.data?.checkoutRequestId;
  const merchantRequestId = response.data?.MerchantRequestID ?? response.data?.merchantRequestId;

  if (response.data?.ResponseCode !== '0' || !checkoutRequestId) {
    throw new Error(response.data?.CustomerMessage || 'Safaricom did not accept the STK push request');
  }

  await prisma.payment.upsert({
    where: { checkoutRequestId },
    update: {
      merchantRequestId,
      phone: normalizedPhone,
      amount: requestAmount.toFixed(2),
      status: 'PENDING',
    },
    create: {
      orderId: order.id,
      checkoutRequestId,
      merchantRequestId,
      phone: normalizedPhone,
      amount: requestAmount.toFixed(2),
    },
  });

  return {
    status: 'PENDING',
    checkoutRequestId,
    merchantRequestId,
    customerMessage: response.data?.CustomerMessage || 'M-Pesa request accepted.',
    phone: normalizedPhone,
    amount: requestAmount,
    accountReference: resolvedAccountReference,
    transactionDesc: String(transactionDesc || 'Nexora Store purchase'),
    mode: config.environment === 'sandbox' ? 'sandbox' : 'live',
  };
}

export async function processStkCallback(body) {
  const callback = body?.Body?.stkCallback;
  if (!callback?.CheckoutRequestID || !Number.isInteger(Number(callback.ResultCode))) {
    throw new Error('Invalid M-Pesa callback payload');
  }

  const resultCode = Number(callback.ResultCode);
  const metadata = Object.fromEntries(
    (callback.CallbackMetadata?.Item || []).map(({ Name, Value }) => [Name, Value]),
  );

  return prisma.$transaction(async (transaction) => {
    const payment = await transaction.payment.findUnique({
      where: { checkoutRequestId: callback.CheckoutRequestID },
    });
    if (!payment) return { accepted: true, matched: false };
    if (payment.status !== 'PENDING') return { accepted: true, matched: true, duplicate: true };

    const succeeded = resultCode === 0;
    if (succeeded) {
      const callbackAmount = Number(metadata.Amount);
      if (!metadata.MpesaReceiptNumber || callbackAmount !== Number(payment.amount)) {
        throw new Error('M-Pesa callback did not match the expected payment');
      }
      if (metadata.PhoneNumber && normalizePhoneNumber(metadata.PhoneNumber) !== payment.phone) {
        throw new Error('M-Pesa callback phone number did not match the payment');
      }
    }

    await transaction.payment.update({
      where: { id: payment.id },
      data: {
        status: succeeded ? 'SUCCEEDED' : 'FAILED',
        resultCode,
        resultDescription: String(callback.ResultDesc || ''),
        mpesaReceiptNumber: succeeded ? String(metadata.MpesaReceiptNumber) : null,
      },
    });

    if (succeeded) {
      await transaction.order.updateMany({
        where: { id: payment.orderId, status: 'PENDING' },
        data: { status: 'PROCESSING' },
      });
    } else {
      const cancelledOrder = await transaction.order.updateMany({
        where: { id: payment.orderId, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });

      if (cancelledOrder.count === 1) {
        const items = await transaction.orderItem.findMany({
          where: { orderId: payment.orderId },
          select: { productId: true, quantity: true },
        });
        for (const item of items) {
          await transaction.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
    }

    return { accepted: true, matched: true, status: succeeded ? 'SUCCEEDED' : 'FAILED' };
  });
}
