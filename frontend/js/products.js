import { api, productCard } from './api.js';
import './site.js';

const grid = document.querySelector('#product-list');
const count = document.querySelector('#product-count');
const search = document.querySelector('#product-search');
const categoryFilters = document.querySelector('#category-filters');
let products = [];
let categories = [];
let selectedCategory = new URLSearchParams(location.search).get('category') || '';

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

function renderCategoryFilters() {
  categoryFilters.replaceChildren();
  const options = [{ name: 'All products', slug: '' }, ...categories];
  options.forEach((category) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `category-filter${selectedCategory === category.slug ? ' is-active' : ''}`;
    button.textContent = category.name;
    button.setAttribute('aria-pressed', String(selectedCategory === category.slug));
    button.addEventListener('click', () => loadProducts(category.slug));
    categoryFilters.append(button);
  });
}

async function loadProducts(categorySlug = '') {
  selectedCategory = categorySlug;
  renderCategoryFilters();
  count.textContent = 'Loading products…';
  grid.replaceChildren();
  grid.innerHTML = '<p class="muted">Loading products…</p>';

  try {
    const suffix = categorySlug ? `?category=${encodeURIComponent(categorySlug)}` : '';
    products = await api(`/api/products${suffix}`);
    const url = new URL(location.href);
    if (categorySlug) url.searchParams.set('category', categorySlug);
    else url.searchParams.delete('category');
    history.replaceState(null, '', url);
    renderProducts();
  } catch (error) {
    count.textContent = 'Collection unavailable';
    grid.innerHTML = `<div class="empty-state"><h2>We could not load the collection.</h2><p>${error.message}</p></div>`;
  }
}

try {
  categories = await api('/api/categories');
  if (selectedCategory && !categories.some((category) => category.slug === selectedCategory)) {
    selectedCategory = '';
  }
  renderCategoryFilters();
  await loadProducts(selectedCategory);
} catch (error) {
  count.textContent = 'Collection unavailable';
  grid.innerHTML = `<div class="empty-state"><h2>We could not load the collection.</h2><p>${error.message}</p></div>`;
}