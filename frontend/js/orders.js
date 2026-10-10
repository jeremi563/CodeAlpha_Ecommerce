import { api, formatPrice, getSession } from './api.js';
import './site.js';

const list = document.querySelector('#orders-list');

if (!getSession()?.token) {
  location.replace(`/login.html?next=${encodeURIComponent('/orders.html')}`);
} else {
  try {
    const { orders } = await api('/api/orders');
    if (orders.length === 0) {
      list.innerHTML = '<div class="empty-state"><h2>No orders to show yet.</h2><p>Your next favourite might be waiting in the collection.</p><a class="button button-dark" href="/products.html">Explore the collection</a></div>';
    } else {
      list.replaceChildren(...orders.map(renderOrder));
    }
  } catch (error) {
    list.innerHTML = `<div class="empty-state"><h2>Orders could not load.</h2><p>${escapeText(error.message)}</p></div>`;
  }
}

function renderOrder(order) {
  const card = document.createElement('article');
  card.className = 'order-card';
  const date = new Date(order.createdAt).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
  const items = order.items.map((item) => `<div class="order-item-line"><span>${escapeText(item.productName)} × ${item.quantity} <span aria-label="each">(${formatPrice(item.unitPrice)} each)</span></span><strong>${formatPrice(item.subtotal)}</strong></div>`).join('');
  const delivery = order.recipientName ? `<div class="order-delivery"><strong>Deliver to</strong>${escapeText(order.recipientName)} · ${escapeText(order.deliveryPhone)}<br>${escapeText(order.deliveryAddress)}, ${escapeText(order.deliveryCity)}, ${escapeText(order.deliveryCounty)}${order.deliveryInstructions ? `<br>${escapeText(order.deliveryInstructions)}` : ''}</div>` : '';
  const successfulPayment = order.payments?.find((payment) => payment.status === 'SUCCEEDED');
  const payment = successfulPayment
    ? `<div class="order-payment"><strong>Payment received</strong>${successfulPayment.mpesaReceiptNumber ? `M-Pesa receipt: ${escapeText(successfulPayment.mpesaReceiptNumber)}` : 'M-Pesa payment confirmed'}</div>`
    : order.status === 'PENDING'
      ? '<div class="order-payment"><strong>Payment pending</strong>We will update this order when payment is confirmed.</div>'
      : '';
  card.innerHTML = `<div class="order-card-header"><div><p class="order-ref">Order ${escapeText(order.id.slice(0, 8).toUpperCase())}</p><p class="order-date">${date}</p></div><span class="status-pill ${order.status === 'CANCELLED' ? 'status-cancelled' : ''}">${escapeText(order.status)}</span></div><div class="order-card-body">${items}<div class="order-card-total"><span>Total</span><span>${formatPrice(order.total)}</span></div>${payment}${delivery}</div>`;
  return card;
}

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}