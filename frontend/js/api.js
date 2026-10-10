const sessionKey = 'nexora-session';
const fallbackImage = '/assets/product-default.jpg';

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(sessionKey) || 'null');
  } catch {
    return null;
  }
}

export function saveSession(session) {
  localStorage.setItem(sessionKey, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(sessionKey);
}

export async function api(path, options = {}) {
  const session = getSession();
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (session?.token) headers.set('Authorization', `Bearer ${session.token}`);

  let response;
  try {
    response = await fetch(path, { ...options, headers });
  } catch {
    throw new Error('Could not reach the store. Check that the server is running and try again.');
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') || '';
  const result = contentType.includes('application/json') ? await response.json() : null;
  if (!response.ok) throw new Error(result?.message || `Request failed (${response.status})`);
  return result;
}

export function formatPrice(value) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export function productImage(value) {
  if (typeof value !== 'string' || !value.trim()) return fallbackImage;

  const trimmed = value.trim();

  if (trimmed.startsWith('/')) {
    try {
      return new URL(trimmed, location.origin).href;
    } catch {
      return fallbackImage;
    }
  }

  try {
    const url = new URL(trimmed);
    const allowedProtocols = new Set(['http:', 'https:', 'data:', 'blob:']);
    if (!allowedProtocols.has(url.protocol)) return fallbackImage;
    return url.href;
  } catch {
    return fallbackImage;
  }
}

export function showToast(message, isError = false) {
  let region = document.querySelector('.toast-region');
  if (!region) {
    region = document.createElement('div');
    region.className = 'toast-region';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    document.body.append(region);
  }

  const toast = document.createElement('div');
  toast.className = `toast${isError ? ' error' : ''}`;
  toast.textContent = message;
  region.append(toast);
  window.setTimeout(() => toast.remove(), 3600);
}

export function productCard(product) {
  const card = document.createElement('article');
  card.className = 'product-card';

  const link = document.createElement('a');
  link.className = 'product-card-image';
  link.href = `/product.html?id=${encodeURIComponent(product.id)}`;
  link.setAttribute('aria-label', `View ${product.name}`);

  const image = document.createElement('img');
  image.src = productImage(product.imageUrl);
  image.alt = product.name;
  image.loading = 'lazy';
  image.addEventListener('error', () => { image.src = fallbackImage; }, { once: true });
  link.append(image);

  if (product.stock <= 3) {
    const badge = document.createElement('span');
    badge.className = 'product-badge';
    badge.textContent = product.stock > 0 ? 'Almost gone' : 'Sold out';
    link.append(badge);
  }

  const info = document.createElement('div');
  info.className = 'product-card-info';
  const details = document.createElement('div');
  const title = document.createElement('h3');
  title.className = 'product-card-title';
  const titleLink = document.createElement('a');
  titleLink.href = link.href;
  titleLink.textContent = product.name;
  title.append(titleLink);
  details.append(title);

  if (product.description) {
    const description = document.createElement('p');
    description.className = 'product-card-description';
    description.textContent = product.description;
    details.append(description);
  }

  const price = document.createElement('span');
  price.className = 'product-price';
  price.textContent = formatPrice(product.price);
  info.append(details, price);
  card.append(link, info);
  return card;
}