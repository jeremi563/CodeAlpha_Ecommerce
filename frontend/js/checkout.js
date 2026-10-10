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
      <aside class="summary-panel"><h2>Delivery details</h2><p class="summary-caption">Where should we deliver your order?</p>
        <form id="checkout-form" class="stack-form">
          <label>Recipient name<input name="recipientName" autocomplete="name" maxlength="100" required></label>
          <label>Delivery phone<input name="deliveryPhone" type="tel" autocomplete="tel" inputmode="tel" placeholder="0712345678" maxlength="20" required></label>
          <label>Street address / building<input name="deliveryAddress" autocomplete="street-address" maxlength="200" required></label>
          <label>Town or city<input name="deliveryCity" autocomplete="address-level2" maxlength="80" required></label>
          <label>County<input name="deliveryCounty" autocomplete="address-level1" maxlength="80" required></label>
          <label>Delivery instructions <span class="muted">(optional)</span><textarea name="deliveryInstructions" rows="2" maxlength="300" placeholder="Landmark, gate, or other directions"></textarea></label>
          <label>M-Pesa phone<input name="mpesaPhone" type="tel" inputmode="tel" placeholder="254712345678" maxlength="13" required></label>
          <p class="form-message" id="checkout-message" aria-live="polite"></p>
          <button class="button button-dark button-full" id="place-order" type="submit">Continue to M-Pesa <span aria-hidden="true">→</span></button>
        </form>
      </aside>`;

    content.querySelector('#checkout-form').addEventListener('submit', placeOrder);
  } catch (error) {
    content.innerHTML = `<div class="empty-state"><h2>We could not load checkout.</h2><p>${escapeText(error.message)}</p><a class="button button-dark" href="/cart.html">Return to your bag</a></div>`;
  }
}

async function placeOrder(event) {
  event.preventDefault();
  const button = event.currentTarget;
  const message = content.querySelector('#checkout-message');
  const form = event.currentTarget;
  const formData = new FormData(form);
  button.disabled = true;
  message.textContent = '';

  try {
    const phone = String(formData.get('mpesaPhone') || '').trim();
    if (!/^0\d{9}$/.test(phone) && !/^254\d{9}$/.test(phone) && !/^\+254\d{9}$/.test(phone)) {
      throw new Error('Enter a valid Kenyan mobile number, for example 254712345678');
    }

    const cart = await api('/api/cart');
    if (!pendingOrderId) {
      const orderResult = await api('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          recipientName: String(formData.get('recipientName') || '').trim(),
          deliveryPhone: String(formData.get('deliveryPhone') || '').trim(),
          deliveryAddress: String(formData.get('deliveryAddress') || '').trim(),
          deliveryCity: String(formData.get('deliveryCity') || '').trim(),
          deliveryCounty: String(formData.get('deliveryCounty') || '').trim(),
          deliveryInstructions: String(formData.get('deliveryInstructions') || '').trim(),
        }),
      });
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

    window.dispatchEvent(new Event('cart-updated'));
    if (payment.mode === 'sandbox') {
      showPaymentState('Sandbox request simulated', 'No payment was collected. Enable a configured M-Pesa sandbox account to receive a real STK prompt.', pendingOrderId, payment.amount);
      return;
    }

    showPaymentState('STK prompt sent', `Complete the M-Pesa prompt sent to ${escapeText(payment.phone)}. We are waiting for Safaricom to confirm the payment.`, pendingOrderId, payment.amount);
    await waitForPaymentConfirmation(pendingOrderId, payment.amount);
  } catch (error) {
    message.textContent = error.message;
    message.classList.add('form-message');
    button.disabled = false;
    showToast(error.message, true);
  }
}

function showPaymentState(title, description, orderId, amount, confirmed = false, receipt = '') {
  content.innerHTML = `
    <div class="checkout-lines">
      <div class="checkout-success ${confirmed ? '' : 'checkout-pending'}" role="status" aria-live="polite">
        <strong>${escapeText(title)}</strong>${escapeText(description)}
        ${receipt ? `<span class="payment-receipt">M-Pesa receipt: ${escapeText(receipt)}</span>` : ''}
      </div>
    </div>
    <aside class="summary-panel">
      <h2>${confirmed ? 'Order processing' : 'Order status'}</h2>
      <div class="summary-line"><span>Order</span><span>${escapeText(orderId.slice(0, 8).toUpperCase())}</span></div>
      <div class="summary-total"><span>Order total</span><span>${formatPrice(amount)}</span></div>
      <a class="button button-dark button-full" href="/orders.html">View your orders <span aria-hidden="true">→</span></a>
    </aside>`;
}

async function waitForPaymentConfirmation(orderId, amount) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    try {
      const { order } = await api(`/api/orders/${encodeURIComponent(orderId)}`);
      const payment = order.payments?.[0];
      if (payment?.status === 'SUCCEEDED') {
        showPaymentState(
          'Payment received',
          'Your payment has been confirmed. Your order is now being processed for delivery.',
          orderId,
          payment.amount || amount,
          true,
          payment.mpesaReceiptNumber,
        );
        return;
      }
      if (payment?.status === 'FAILED' || order.status === 'CANCELLED') {
        showPaymentState('Payment not completed', 'Safaricom did not confirm this payment. The order was cancelled; you can place it again from your cart.', orderId, amount);
        return;
      }
    } catch {
      // Keep waiting; the payment callback and order status may not be visible immediately.
    }
  }

  showPaymentState('Payment confirmation is taking longer', 'Your order status is still being checked. Visit your orders page shortly to see the latest update.', orderId, amount);
}

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}