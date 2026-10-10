import { api, formatPrice, getSession, productImage, showToast } from './api.js';
import './site.js';

const container = document.querySelector('#product-detail');
const productId = new URLSearchParams(location.search).get('id');

function renderMessage(title, message, linkText = 'Browse the collection') {
  container.innerHTML = `<div class="empty-state"><h2>${title}</h2><p>${message}</p><a class="button button-dark" href="/products.html">${linkText}</a></div>`;
}

if (!productId) {
  renderMessage('No product selected.', 'Choose something from the collection first.');
} else {
  try {
    const product = await api(`/api/products/${encodeURIComponent(productId)}`);
    document.title = `${product.name} | Nexora Store`;
    const available = product.stock > 0;
    container.innerHTML = `
      <div class="detail-image"><img src="${productImage(product.imageUrl)}" alt="${escapeText(product.name)}"></div>
      <div class="detail-copy">
        <p class="eyebrow">The everyday edit</p><h1>${escapeText(product.name)}<span class="heading-period">.</span></h1>
        <span class="detail-price">${formatPrice(product.price)}</span>
        <p class="detail-description">${escapeText(product.description || 'Made to earn its place in your everyday routine.')}</p>
        <div class="stock-line"><span class="stock-dot${available ? '' : ' out'}"></span>${available ? `${product.stock} available` : 'Currently out of stock'}</div>
        <div class="detail-actions">
          <div class="quantity-control"><button type="button" data-step="-1" aria-label="Decrease quantity">−</button><input id="quantity" type="number" min="1" max="${product.stock}" value="1" aria-label="Quantity" ${available ? '' : 'disabled'}><button type="button" data-step="1" aria-label="Increase quantity" ${available ? '' : 'disabled'}>+</button></div>
          <button class="button button-dark" id="add-to-cart" type="button" ${available ? '' : 'disabled'}>Add to bag <span aria-hidden="true">→</span></button>
        </div>
        <p class="detail-note">Your cart is saved to your account. Product availability is confirmed again at checkout.</p>
      </div>`;

    container.querySelector('.detail-image img').addEventListener('error', (event) => {
      event.currentTarget.src = '/assets/product-default.jpg';
    }, { once: true });

    const quantityInput = container.querySelector('#quantity');
    container.querySelectorAll('[data-step]').forEach((button) => {
      button.addEventListener('click', () => {
        const next = Number(quantityInput.value) + Number(button.dataset.step);
        quantityInput.value = String(Math.max(1, Math.min(product.stock, next)));
      });
    });
    container.querySelector('#add-to-cart')?.addEventListener('click', async () => {
      if (!getSession()?.token) {
        location.assign(`/login.html?next=${encodeURIComponent(location.pathname + location.search)}`);
        return;
      }
      const button = container.querySelector('#add-to-cart');
      button.disabled = true;
      try {
        await api('/api/cart', {
          method: 'POST',
          body: JSON.stringify({ productId: product.id, quantity: Number(quantityInput.value) }),
        });
        window.dispatchEvent(new Event('cart-updated'));
        showToast('Added to your bag.');
      } catch (error) {
        showToast(error.message, true);
      } finally {
        button.disabled = false;
      }
    });
  } catch (error) {
    renderMessage('We could not find that one.', error.message);
  }
}

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}