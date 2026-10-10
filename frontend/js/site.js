import { api, clearSession, getSession } from './api.js';

const session = getSession();
const header = document.querySelector('#site-header');
const footer = document.querySelector('#site-footer');

if (header) {
  header.innerHTML = `
    <div class="announcement">A little more considered. A lot more useful.</div>
    <header class="site-header">
      <div class="header-inner wrap">
        <a class="brand" href="/" aria-label="Nexora Store home"><span class="brand-mark">N</span><span>NEXORA</span></a>
        <nav class="main-nav" id="main-nav" aria-label="Main navigation">
          <a href="/">Home</a><a href="/products.html">Shop all</a>
          ${session?.user ? '<a href="/orders.html">My orders</a>' : ''}
          ${session?.user?.role === 'ADMIN' ? '<a href="/admin.html">Store desk</a>' : ''}
        </nav>
        <div class="header-actions">
          ${session?.user ? '<button class="header-text-button" id="sign-out" type="button">Sign out</button>' : '<a href="/login.html">Sign in</a>'}
          <a class="cart-link" href="/cart.html">Bag <span class="cart-count" id="cart-count">0</span></a>
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
        <nav class="footer-links" aria-label="Footer navigation"><a href="/products.html">Shop all</a><a href="/cart.html">Your bag</a><a href="/orders.html">Orders</a><a href="/login.html">Account</a></nav>
      </div>
    </footer>`;
}