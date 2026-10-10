import { api, formatPrice, getSession, showToast } from './api.js';
import './site.js';

const content = document.querySelector('#checkout-content');
let pendingOrderId = '';

if (!getSession()?.token) {
  location.replace(`/login.html?next=${encodeURIComponent('/checkout.html')}`);
} else {
  await loadSummary();
}

async function loadSummary() {
  try {
    const cart = await api('/api/cart');
    if (cart.items.length === 0) {
      content.innerHTML = '<div class="empty-state"><h2>Nothing to check out yet.</h2><p>Add an item to your bag first.</p><a class="button button-dark" href="/products.html">Browse the collection</a></div>';
      return;
    }

    const lines = cart.items.map(({ product, quantity }) => `
      <div class="checkout-item"><span>${escapeText(product.name)} × ${quantity}</span><strong>${formatPrice(Number(product.price) * quantity)}</strong></div>`).join('');
    content.innerHTML = `
      <div class="checkout-lines">${lines}<div class="summary-total"><span>Total</span><span>${formatPrice(cart.total)}</span></div></div>
      <aside class="summary-panel"><h2>Ready when you are.</h2><p class="summary-caption">Pay securely with M-Pesa STK push. We’ll also place your order as soon as the payment request is accepted.</p><label class="stack-form" style="margin-bottom: 12px;">
        <span>Phone number</span>
        <input id="mpesa-phone" type="tel" inputmode="tel" value="2547" placeholder="254712345678" required>
      </label><p class="form-message" id="checkout-message" aria-live="polite"></p><button class="button button-dark button-full" id="place-order" type="button">Pay with M-Pesa <span aria-hidden="true">→</span></button></aside>`;

    content.querySelector('#place-order').addEventListener('click', placeOrder);
  } catch (error) {
    content.innerHTML = `<div class="empty-state"><h2>We could not load checkout.</h2><p>${escapeText(error.message)}</p><a class="button button-dark" href="/cart.html">Return to your bag</a></div>`;
  }
}

async function placeOrder(event) {
  const button = event.currentTarget;
  const message = content.querySelector('#checkout-message');
  const phoneInput = content.querySelector('#mpesa-phone');
  button.disabled = true;
  message.textContent = '';

  try {
    const phone = String(phoneInput.value || '').trim();
    if (!/^0\d{9}$/.test(phone) && !/^254\d{9}$/.test(phone) && !/^\+254\d{9}$/.test(phone)) {
      throw new Error('Enter a valid Kenyan mobile number, for example 254712345678');
    }

    const cart = await api('/api/cart');
    if (!pendingOrderId) {
      const orderResult = await api('/api/orders', { method: 'POST' });
      pendingOrderId = orderResult.order.id;
    }

    const payment = await api('/api/payments/mpesa/stk-push', {
      method: 'POST',
      body: JSON.stringify({
        orderId: pendingOrderId,
        phone,
        amount: Number(cart.total),
        accountReference: 'NEXORA',
        transactionDesc: 'Nexora Store purchase',
      }),
    });

    content.innerHTML = `
      <div class="checkout-success">
        <strong>Payment request sent.</strong>
        A prompt has been sent to ${escapeText(payment.phone)}. Your order number is ${escapeText(pendingOrderId)}.
      </div>
      <div class="summary-panel">
        <div class="summary-total"><span>Order total</span><span>${formatPrice(payment.amount)}</span></div>
        <a class="button button-dark button-full" href="/orders.html">View your orders <span aria-hidden="true">→</span></a>
      </div>`;
    window.dispatchEvent(new Event('cart-updated'));
  } catch (error) {
    message.textContent = error.message;
    message.classList.add('form-message');
    button.disabled = false;
    showToast(error.message, true);
  }
}

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}