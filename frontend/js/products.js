import { api, productCard } from './api.js';
import './site.js';

const grid = document.querySelector('#product-list');
const count = document.querySelector('#product-count');
const search = document.querySelector('#product-search');
let products = [];

function renderProducts() {
  const query = search.value.trim().toLowerCase();
  const visibleProducts = products.filter((product) => {
    return `${product.name} ${product.description || ''}`.toLowerCase().includes(query);
  });

  count.textContent = `${visibleProducts.length} ${visibleProducts.length === 1 ? 'piece' : 'pieces'}`;
  grid.replaceChildren();
  if (visibleProducts.length === 0) {
    grid.innerHTML = '<div class="empty-state"><h2>No matches just yet.</h2><p>Try another search or browse the full collection.</p></div>';
    return;
  }
  visibleProducts.forEach((product) => grid.append(productCard(product)));
}

search.addEventListener('input', renderProducts);

try {
  products = await api('/api/products');
  renderProducts();
} catch (error) {
  count.textContent = 'Collection unavailable';
  grid.innerHTML = `<div class="empty-state"><h2>We could not load the collection.</h2><p>${error.message}</p></div>`;
}