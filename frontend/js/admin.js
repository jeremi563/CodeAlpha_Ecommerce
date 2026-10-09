import { api, formatPrice, getSession, showToast } from './api.js';
import './site.js';

const message = document.querySelector('#admin-message');
const productList = document.querySelector('#admin-products');
const orderList = document.querySelector('#admin-orders');
const productForm = document.querySelector('#product-form');
const imagePreview = document.querySelector('#image-preview');
const imagePreviewEmpty = document.querySelector('#image-preview-empty');
const orderStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

if (!getSession()?.token) {
  location.replace(`/login.html?next=${encodeURIComponent('/admin.html')}`);
} else {
  try {
    const { user } = await api('/api/auth/me');
    if (user.role !== 'ADMIN') {
      message.textContent = 'Admin access is required to view the store desk.';
      productForm.remove();
    } else {
      bindImagePreview();
      await refreshAdminData();
      productForm.addEventListener('submit', createProduct);
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

    const objectUrl = URL.createObjectURL(file);
    imagePreview.src = objectUrl;
    imagePreview.hidden = false;
    imagePreviewEmpty.hidden = true;
  });
}

async function refreshAdminData() {
  const [products, { orders }] = await Promise.all([
    api('/api/products'),
    api('/api/admin/orders'),
  ]);
  renderProducts(products);
  renderOrders(orders);
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
      description: String(form.get('description') || '').trim() || null,
      imageUrl: finalImageUrl,
    };

    await api('/api/products', { method: 'POST', body: JSON.stringify(data) });
    productForm.reset();
    productForm.elements.stock.value = '0';
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
    <tr><td>${escapeText(product.name)}</td><td>${formatPrice(product.price)}</td><td><label class="sr-only" for="stock-${product.id}">Stock for ${escapeText(product.name)}</label><input class="table-number" id="stock-${product.id}" type="number" min="0" step="1" value="${product.stock}"></td><td><div class="admin-actions"><button class="button button-light" type="button" data-action="save-stock" data-id="${product.id}">Save stock</button><button class="admin-delete" type="button" data-action="delete-product" data-id="${product.id}">Delete</button></div></td></tr>`).join('');
  productList.innerHTML = `<table class="admin-table"><thead><tr><th>Product</th><th>Price</th><th>Available</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>`;
  productList.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        if (button.dataset.action === 'save-stock') {
          const stock = Number(productList.querySelector(`#stock-${button.dataset.id}`).value);
          await api(`/api/products/${button.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ stock }) });
          showToast('Stock updated.');
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