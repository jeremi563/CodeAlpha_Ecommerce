import { api, formatPrice, getSession, productImage, showToast } from './api.js';
import './site.js';

const content = document.querySelector('#cart-content');
const session = getSession();

if (!session?.token) {
  location.replace(`/login.html?next=${encodeURIComponent('/cart.html')}`);
} else {
  await renderCart();
}

async function renderCart() {
  try {
    const cart = await api('/api/cart');
    if (cart.items.length === 0) {
      content.innerHTML = '<div class="empty-state"><h2>Your bag is taking a breather.</h2><p>Find something useful for the road ahead.</p><a class="button button-dark" href="/products.html">Browse the collection <span aria-hidden="true">→</span></a></div>';
      return;
    }

    const rows = cart.items.map(({ product, quantity }) => `
      <article class="cart-row" data-product-id="${product.id}">
        <img src="${productImage(product.imageUrl)}" alt="${escapeText(product.name)}">
        <div><h2><a href="/product.html?id=${encodeURIComponent(product.id)}">${escapeText(product.name)}</a></h2><p class="muted">${formatPrice(product.price)} each</p></div>
        <div class="cart-row-end">
          <div class="quantity-control"><button type="button" data-action="decrease" aria-label="Decrease ${escapeText(product.name)} quantity">−</button><input type="number" min="1" max="${product.stock}" value="${quantity}" aria-label="${escapeText(product.name)} quantity"><button type="button" data-action="increase" aria-label="Increase ${escapeText(product.name)} quantity">+</button></div>
          <span class="cart-line-total">${formatPrice(Number(product.price) * quantity)}</span>
          <button class="remove-button" data-action="remove" type="button">Remove</button>
        </div>
      </article>`).join('');

    content.innerHTML = `
      <div class="cart-items">${rows}</div>
      <aside class="cart-summary"><h2>Order summary</h2><div class="summary-line"><span>Items</span><span>${cart.items.reduce((sum, item) => sum + item.quantity, 0)}</span></div><div class="summary-total"><span>Subtotal</span><span>${formatPrice(cart.total)}</span></div><p class="summary-caption">Shipping and any applicable charges are confirmed separately. Final product availability is checked when you place your order.</p><a class="button button-dark button-full" href="/checkout.html">Continue to checkout <span aria-hidden="true">→</span></a><button class="button button-light button-full cart-clear" type="button" data-action="clear-cart">Clear bag</button></aside>`;

    content.querySelectorAll('.cart-row img').forEach((image) => {
      image.addEventListener('error', (event) => {
        event.currentTarget.src = '/assets/product-default.jpg';
      }, { once: true });
    });

    content.querySelectorAll('[data-action]').forEach((button) => {
      button.addEventListener('click', async () => {
        const action = button.dataset.action;
        try {
          if (action === 'remove') {
            const productId = button.closest('[data-product-id]').dataset.productId;
            await api(`/api/cart/${productId}`, { method: 'DELETE' });
          } else if (action === 'clear-cart') {
            await api('/api/cart', { method: 'DELETE' });
          } else {
            const row = button.closest('[data-product-id]');
            const productId = row.dataset.productId;
            const current = Number(row.querySelector('input').value);
            const quantity = action === 'increase' ? current + 1 : Math.max(1, current - 1);
            await api(`/api/cart/${productId}`, { method: 'PATCH', body: JSON.stringify({ quantity }) });
          }
          await renderCart();
          window.dispatchEvent(new Event('cart-updated'));
        } catch (error) {
          showToast(error.message, true);
        }
      });
    });
  } catch (error) {
    content.innerHTML = `<div class="empty-state"><h2>Your bag could not load.</h2><p>${escapeText(error.message)}</p><a class="button button-dark" href="/products.html">Back to the collection</a></div>`;
  }
}

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}