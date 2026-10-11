import { api, getSession } from './api.js';
import './site.js';

const session = getSession();
if (!session?.token) {
  location.replace('/login.html?next=/dashboard.html');
}

const container = document.querySelector('#dashboard-content');

async function loadDashboard() {
  try {
    const [userData, cartData] = await Promise.all([
      api('/api/auth/me'),
      api('/api/cart'),
    ]);

    const user = userData.user || session.user;
    const cartCount = cartData.items.reduce((sum, item) => sum + item.quantity, 0);
    const orderCount = user?.orders?.length ?? 0;

    container.innerHTML = `
      <section class="dashboard-panel">
        <span class="account-highlight">Signed in</span>
        <h2>Welcome, ${escapeHtml(user.name)}</h2>
        <p>Everything important to your store activity is available here. Keep an eye on your orders, manage your details, and jump back into shopping at any moment.</p>
        <div class="stat-grid">
          <div class="stat-card"><span class="stat-card-label">Account</span><strong>${escapeHtml(user.role)}</strong></div>
          <div class="stat-card"><span class="stat-card-label">Cart</span><strong>${cartCount}</strong></div>
          <div class="stat-card"><span class="stat-card-label">Orders</span><strong>${orderCount}</strong></div>
        </div>
      </section>
      <aside class="account-card">
        <h2>Quick access</h2>
        <ul class="account-status-list">
          <li><span>Signed in email</span><strong>${escapeHtml(user.email)}</strong></li>
          <li><span>Security</span><strong>Password protected</strong></li>
          <li><span>Delivery</span><strong>Ready for checkout</strong></li>
        </ul>
        <div class="account-actions" style="margin-top: 18px;">
          <a class="button button-dark" href="/account.html">Manage account</a>
          <a class="button button-light" href="/orders.html">View orders</a>
        </div>
      </aside>
    `;
  } catch (error) {
    container.innerHTML = `<div class="empty-state"><h2>We could not load your dashboard.</h2><p>${escapeHtml(error.message)}</p><a class="button button-dark" href="/products.html">Back to shop</a></div>`;
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

await loadDashboard();
