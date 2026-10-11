import { api, formatPrice, getSession, showToast } from './api.js';
import './site.js';

const message = document.querySelector('#admin-message');
const productList = document.querySelector('#admin-products');
const orderList = document.querySelector('#admin-orders');
const categoryList = document.querySelector('#admin-categories');
const productForm = document.querySelector('#product-form');
const categoryForm = document.querySelector('#category-form');
const imagePreview = document.querySelector('#image-preview');
const imagePreviewEmpty = document.querySelector('#image-preview-empty');
const orderStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
let previewObjectUrl = '';
let categories = [];

if (!getSession()?.token) {
  location.replace(`/login.html?next=${encodeURIComponent('/admin.html')}`);
} else {
  try {
    const { user } = await api('/api/auth/me');
    if (user.role !== 'ADMIN') {
      message.textContent = 'Admin access is required to view the store desk.';
      productForm.remove();
      categoryForm.closest('.admin-section').remove();
    } else {
      bindImagePreview();
      await refreshAdminData();
      productForm.addEventListener('submit', createProduct);
      categoryForm.addEventListener('submit', createCategory);
    }
  } catch (error) {
    message.textContent = error.message;
  }
}

function bindImagePreview() {
  const imageUploadField = productForm.elements.imageUpload;
  if (!imageUploadField) return;

  imageUploadField.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      imagePreview.hidden = true;
      imagePreviewEmpty.hidden = false;
      imagePreview.removeAttribute('src');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image files must be 5MB or smaller.', true);
      imageUploadField.value = '';
      imagePreview.hidden = true;
      imagePreviewEmpty.hidden = false;
      imagePreview.removeAttribute('src');
      return;
    }

    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = URL.createObjectURL(file);
    imagePreview.src = previewObjectUrl;
    imagePreview.hidden = false;
    imagePreviewEmpty.hidden = true;
  });
}

async function refreshAdminData() {
  const [products, { orders }, loadedCategories] = await Promise.all([
    api('/api/products'),
    api('/api/admin/orders'),
    api('/api/categories'),
  ]);
  categories = loadedCategories;
  renderCategories(categories);
  populateProductCategoryOptions();
  renderProducts(products);
  renderOrders(orders);
}

function populateProductCategoryOptions() {
  const select = productForm.elements.categoryId;
  select.replaceChildren(...categories.map((category) => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.name;
    return option;
  }));
  const uncategorized = categories.find((category) => category.slug === 'uncategorized');
  if (uncategorized) select.value = uncategorized.id;
}

async function createCategory(event) {
  event.preventDefault();
  const button = categoryForm.querySelector('button');
  button.disabled = true;
  try {
    const name = String(new FormData(categoryForm).get('name') || '').trim();
    await api('/api/categories', { method: 'POST', body: JSON.stringify({ name }) });
    categoryForm.reset();
    showToast('Category added.');
    await refreshAdminData();
  } catch (error) {
    showToast(error.message, true);
  } finally {
    button.disabled = false;
  }
}

async function readImageFile(file) {
  if (!file) return null;

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image files must be 5MB or smaller.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.readAsDataURL(file);
  });
}

async function createProduct(event) {
  event.preventDefault();
  const button = productForm.querySelector('button');
  button.disabled = true;
  message.textContent = '';
  const form = new FormData(productForm);
  const imageUpload = form.get('imageUpload');
  const imageUrlValue = String(form.get('imageUrl') || '').trim();

  try {
    const finalImageUrl = imageUpload && imageUpload instanceof File && imageUpload.size > 0
      ? await readImageFile(imageUpload)
      : imageUrlValue || null;

    const data = {
      name: String(form.get('name') || '').trim(),
      price: Number(form.get('price')),
      stock: Number(form.get('stock')),
      categoryId: String(form.get('categoryId') || ''),
      description: String(form.get('description') || '').trim() || null,
      imageUrl: finalImageUrl,
    };

    await api('/api/products', { method: 'POST', body: JSON.stringify(data) });
    productForm.reset();
    productForm.elements.stock.value = '0';
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = '';
    imagePreview.hidden = true;
    imagePreviewEmpty.hidden = false;
    imagePreview.removeAttribute('src');
    message.textContent = 'Product added to the collection.';
    message.classList.add('success');
    await refreshAdminData();
  } catch (error) {
    message.textContent = error.message;
    message.classList.remove('success');
  } finally {
    button.disabled = false;
  }
}

function renderProducts(products) {
  if (products.length === 0) {
    productList.innerHTML = '<p class="empty-state">No active products.</p>';
    return;
  }

  const rows = products.map((product) => `
    <tr><td>${escapeText(product.name)}</td><td>${formatPrice(product.price)}</td><td><label class="sr-only" for="category-${product.id}">Category for ${escapeText(product.name)}</label><select id="category-${product.id}" data-category-for="${product.id}">${categories.map((category) => `<option value="${category.id}" ${product.categoryId === category.id ? 'selected' : ''}>${escapeText(category.name)}</option>`).join('')}</select></td><td><label class="sr-only" for="stock-${product.id}">Stock for ${escapeText(product.name)}</label><input class="table-number" id="stock-${product.id}" type="number" min="0" step="1" value="${product.stock}"></td><td><div class="admin-actions"><button class="button button-light" type="button" data-action="save-product" data-id="${product.id}">Save</button><button class="admin-delete" type="button" data-action="delete-product" data-id="${product.id}">Delete</button></div></td></tr>`).join('');
  productList.innerHTML = `<table class="admin-table"><thead><tr><th>Product</th><th>Price</th><th>Category</th><th>Available</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>`;
  productList.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        if (button.dataset.action === 'save-product') {
          const stock = Number(productList.querySelector(`#stock-${button.dataset.id}`).value);
          const categoryId = productList.querySelector(`[data-category-for="${button.dataset.id}"]`).value;
          await api(`/api/products/${button.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ stock, categoryId }) });
          showToast('Product updated.');
        } else {
          if (!window.confirm('Delete this product from the collection?')) return;
          await api(`/api/products/${button.dataset.id}`, { method: 'DELETE' });
          showToast('Product deleted.');
        }
        await refreshAdminData();
      } catch (error) {
        showToast(error.message, true);
      }
    });
  });
}

function renderCategories(categoryRows) {
  if (categoryRows.length === 0) {
    categoryList.innerHTML = '<p class="empty-state">No categories yet.</p>';
    return;
  }

  const rows = categoryRows.map((category) => `
    <tr><td><label class="sr-only" for="category-name-${category.id}">Category name</label><input id="category-name-${category.id}" type="text" maxlength="60" value="${escapeText(category.name)}"></td><td>${category._count?.products ?? 0}</td><td><div class="admin-actions"><button class="button button-light" type="button" data-save-category="${category.id}">Save name</button><button class="admin-delete" type="button" data-delete-category="${category.id}" ${category.slug === 'uncategorized' ? 'disabled title="The default category cannot be deleted"' : ''}>Delete</button></div></td></tr>`).join('');
  categoryList.innerHTML = `<table class="admin-table"><thead><tr><th>Category</th><th>Products</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>`;

  categoryList.querySelectorAll('[data-save-category]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = button.dataset.saveCategory;
      const name = categoryList.querySelector(`#category-name-${id}`).value.trim();
      try {
        await api(`/api/categories/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) });
        showToast('Category updated.');
        await refreshAdminData();
      } catch (error) {
        showToast(error.message, true);
      }
    });
  });

  categoryList.querySelectorAll('[data-delete-category]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!window.confirm('Delete this category? Categories with products cannot be deleted.')) return;
      try {
        await api(`/api/categories/${button.dataset.deleteCategory}`, { method: 'DELETE' });
        showToast('Category deleted.');
        await refreshAdminData();
      } catch (error) {
        showToast(error.message, true);
      }
    });
  });
}

function renderOrders(orders) {
  if (orders.length === 0) {
    orderList.innerHTML = '<p class="empty-state">No orders have been placed yet.</p>';
    return;
  }

  const rows = orders.map((order) => `
    <tr><td>${escapeText(order.id.slice(0, 8).toUpperCase())}<br><span class="muted">${escapeText(order.user.name)}</span></td><td>${formatPrice(order.total)}</td><td><label class="sr-only" for="status-${order.id}">Order status</label><select id="status-${order.id}" data-status-for="${order.id}">${orderStatuses.map((status) => `<option value="${status}" ${order.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select></td><td><button class="button button-light" type="button" data-update-order="${order.id}">Update</button></td></tr>`).join('');
  orderList.innerHTML = `<table class="admin-table"><thead><tr><th>Order / customer</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
  orderList.querySelectorAll('[data-update-order]').forEach((button) => {
    button.addEventListener('click', async () => {
      const orderId = button.dataset.updateOrder;
      const status = orderList.querySelector(`[data-status-for="${orderId}"]`).value;
      try {
        await api(`/api/admin/orders/${orderId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
        showToast('Order status updated.');
        await refreshAdminData();
      } catch (error) {
        showToast(error.message, true);
      }
    });
  });
}

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}