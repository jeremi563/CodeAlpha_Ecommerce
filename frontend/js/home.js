import { api, productCard } from './api.js';
import './site.js';

const productGrid = document.querySelector('#featured-products');

try {
  const products = await api('/api/products');
  productGrid.replaceChildren();
  if (products.length === 0) {
    productGrid.innerHTML = '<div class="empty-state"><h2>The shelves are taking shape.</h2><p>Check back soon for the first collection.</p></div>';
  } else {
    products.slice(0, 4).forEach((product) => productGrid.append(productCard(product)));
  }
} catch (error) {
  productGrid.innerHTML = `<div class="empty-state"><h2>We could not load the collection.</h2><p>${error.message}</p><a class="text-link" href="/products.html">Try the shop page →</a></div>`;
}