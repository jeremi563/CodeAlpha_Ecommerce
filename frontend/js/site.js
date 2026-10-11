import { api, clearSession, getSession } from './api.js';

const session = getSession();
const header = document.querySelector('#site-header');
const footer = document.querySelector('#site-footer');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

if (header) {
  header.innerHTML = `
    <header class="site-header">
      <div class="header-inner wrap">
        <a class="brand" href="/" aria-label="Nexora Store home"><span class="brand-mark">N</span><span>NEXORA</span></a>
        <nav class="main-nav" id="main-nav" aria-label="Main navigation">
          ${session?.token ? '' : '<a href="/">Home</a>'}
          <a href="/products.html">Shop all</a>
          ${session?.user ? '<a href="/dashboard.html">Dashboard</a>' : ''}
          ${session?.user ? '<a href="/account.html">My account</a>' : ''}
          ${session?.user ? '<a href="/orders.html">My orders</a>' : ''}
          ${session?.user?.role === 'ADMIN' ? '<a href="/admin.html">Store desk</a>' : ''}
        </nav>
        <div class="header-actions">
          ${session?.user ? `
            <div class="user-pill" aria-live="polite">
              <span class="user-pill-label">Signed in</span>
              <strong>${escapeHtml(session.user.name)}</strong>
            </div>
            <button class="header-text-button" id="sign-out" type="button">Sign out</button>
          ` : '<a href="/login.html" class="icon-link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg><span class="account-label">Sign in</span></a>'}
          <a class="cart-link" href="/cart.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="19" r="1.7"/><circle cx="17" cy="19" r="1.7"/><path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L19 7H6"/></svg><span class="cart-label">Cart</span><span class="cart-count" id="cart-count">0</span></a>
        </div>
        <button class="menu-toggle" type="button" aria-label="Open navigation" aria-expanded="false" aria-controls="main-nav">☰</button>
      </div>
    </header>`;

  const menuButton = header.querySelector('.menu-toggle');
  menuButton.addEventListener('click', () => {
    const isOpen = header.querySelector('.main-nav').classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  });

  header.querySelector('#sign-out')?.addEventListener('click', () => {
    clearSession();
    location.assign('/');
  });

  const updateCartCount = async () => {
    if (!session?.token) return;
    try {
      const cart = await api('/api/cart');
      const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      const badge = header.querySelector('#cart-count');
      if (badge) badge.textContent = String(count);
    } catch {
      const badge = header.querySelector('#cart-count');
      if (badge) badge.textContent = '0';
    }
  };

  updateCartCount();
  window.addEventListener('cart-updated', updateCartCount);
}

if (footer) {
  footer.innerHTML = `
    <footer class="site-footer">
      <div class="footer-inner wrap">
        <div><a class="footer-brand" href="/">NEXORA STORE</a><p class="footer-copy">Useful things for wherever the day goes.</p></div>
        <nav class="footer-links" aria-label="Footer navigation"><a href="/products.html">Shop all</a><a href="/cart.html">Cart</a><a href="/orders.html">Orders</a><a href="/login.html">Account</a></nav>
      </div>
    </footer>`;
}