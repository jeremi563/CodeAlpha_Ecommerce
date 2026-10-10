const mpesaConfig = {
  enabled: process.env.MPESA_ENABLED === 'true',
  consumerKey: process.env.MPESA_CONSUMER_KEY || '',
  consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
  shortCode: process.env.MPESA_SHORTCODE || '174379',
  passKey: process.env.MPESA_PASSKEY || '',
  environment: process.env.MPESA_ENVIRONMENT || 'sandbox',
  callbackUrl: process.env.MPESA_CALLBACK_URL || '',
  callbackToken: process.env.MPESA_CALLBACK_TOKEN || '',
};

export function getMpesaConfig() {
  return { ...mpesaConfig };
}

export function isMpesaConfigured() {
  return Boolean(
    mpesaConfig.consumerKey &&
    mpesaConfig.consumerSecret &&
    mpesaConfig.shortCode &&
    mpesaConfig.passKey,
  );
}

export function hasPublicCallbackUrl() {
  try {
    return new URL(mpesaConfig.callbackUrl).protocol === 'https:';
  } catch {
    return false;
  }
}

export function hasCallbackToken() {
  return mpesaConfig.callbackToken.length >= 32;
}

export function getMpesaCallbackUrl() {
  const callbackUrl = new URL(mpesaConfig.callbackUrl);
  callbackUrl.searchParams.set('token', mpesaConfig.callbackToken);
  return callbackUrl.toString();
}

export function normalizePhoneNumber(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const cleaned = raw.replace(/\s+/g, '').replace(/[^\d]/g, '');
  if (/^254/.test(cleaned)) return cleaned;
  if (/^0\d{9}$/.test(cleaned)) return `254${cleaned.slice(1)}`;
  if (/^\d{9}$/.test(cleaned)) return `254${cleaned}`;
  return cleaned;
}

export function getMpesaBaseUrl() {
  return mpesaConfig.environment === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
}
