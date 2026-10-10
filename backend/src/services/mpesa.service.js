import axios from 'axios';
import { randomUUID } from 'node:crypto';

import { getMpesaBaseUrl, getMpesaCallbackUrl, getMpesaConfig, hasCallbackToken, hasPublicCallbackUrl, isMpesaConfigured, normalizePhoneNumber } from '../config/mpesa.js';
import prisma from '../config/prisma.js';

function toTimestamp(date = new Date()) {
  return new Date(date).toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
}

function buildPassword(shortCode, passKey, timestamp) {
  return Buffer.from(`${shortCode}${passKey}${timestamp}`).toString('base64');
}

async function getAccessToken() {
  const config = getMpesaConfig();
  if (!isMpesaConfigured()) {
    return null;
  }

  const response = await axios.get(`${getMpesaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    auth: {
      username: config.consumerKey,
      password: config.consumerSecret,
    },
  });

  return response.data.access_token;
}

export async function initiateStkPush({ userId, orderId, phone, amount, accountReference, transactionDesc }) {
  const normalizedPhone = normalizePhoneNumber(phone);
  let amountValue = Number(amount);
  const config = getMpesaConfig();

  if (!normalizedPhone) {
    throw new Error('phone number is required');
  }

  if (!config.enabled) {
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      throw new Error('amount must be a positive number');
    }
    return {
      status: 'PENDING',
      checkoutRequestId: `SIM-${randomUUID()}`,
      merchantRequestId: `SIM-${randomUUID()}`,
      customerMessage: 'M-Pesa sandbox mode is active. No live request was sent.',
      phone: normalizedPhone,
      amount: amountValue,
      accountReference: String(accountReference || 'NEXORA'),
      transactionDesc: String(transactionDesc || 'Nexora Store purchase'),
      mode: 'sandbox',
    };
  }

  if (!isMpesaConfigured()) {
    throw new Error('M-Pesa is enabled but its credentials are incomplete');
  }
  if (!hasPublicCallbackUrl()) {
    throw new Error('MPESA_CALLBACK_URL must be a public HTTPS URL');
  }
  if (!hasCallbackToken()) {
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
  amountValue = Number(order.total);

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
      Amount: Math.round(amountValue),
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
    },
  );

  if (response.data.ResponseCode !== '0' || !response.data.CheckoutRequestID) {
    throw new Error(response.data.CustomerMessage || 'Safaricom did not accept the STK push request');
  }

  await prisma.payment.create({
    data: {
      orderId: order.id,
      checkoutRequestId: response.data.CheckoutRequestID,
      merchantRequestId: response.data.MerchantRequestID,
      phone: normalizedPhone,
      amount: amountValue.toFixed(2),
    },
  });

  return {
    status: 'PENDING',
    ...response.data,
    phone: normalizedPhone,
    amount: amountValue,
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
