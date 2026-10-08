import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';

import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { hashPassword } from '../src/utils/password.js';

const uniqueId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

let baseUrl = '';
let adminToken = '';
let customerToken = '';
let createdProductId = '';
let createdCustomerId = '';
let createdAdminId = '';
let server;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return {
    status: response.status,
    data,
  };
}

test.before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Test server did not bind to a local port');
  }

  baseUrl = `http://127.0.0.1:${address.port}`;

  const adminEmail = `${uniqueId('admin')}@example.com`;
  const adminPassword = 'AdminPass123!';

  const adminUser = await prisma.user.create({
    data: {
      name: 'Phase 8 Admin',
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      role: 'ADMIN',
    },
  });

  createdAdminId = adminUser.id;
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });

  assert.equal(adminLogin.status, 200, 'admin login should succeed');
  adminToken = adminLogin.data.token;

  const customerEmail = `${uniqueId('customer')}@example.com`;
  const customerPassword = 'CustomerPass123!';
  const customerRegister = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Phase 8 Customer',
      email: customerEmail,
      password: customerPassword,
    }),
  });

  assert.equal(customerRegister.status, 201, 'customer registration should succeed');
  createdCustomerId = customerRegister.data.user.id;

  const customerLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: customerEmail, password: customerPassword }),
  });

  assert.equal(customerLogin.status, 200, 'customer login should succeed');
  customerToken = customerLogin.data.token;

  const productPayload = {
    name: `Phase 8 Product ${uniqueId('product')}`,
    description: 'A product created during the phase 8 smoke test.',
    price: 2999.99,
    stock: 4,
    imageUrl: 'https://example.com/images/phase8-product.jpg',
  };

  const productResponse = await request('/api/products', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(productPayload),
  });

  assert.equal(productResponse.status, 201, 'admin product creation should succeed');
  createdProductId = productResponse.data.id;
  assert.ok(createdProductId, 'created product must have an id');
});

test.after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  if (createdProductId) {
    await prisma.product.deleteMany({ where: { id: createdProductId } }).catch(() => {});
  }

  if (createdCustomerId) {
    await prisma.user.deleteMany({ where: { id: createdCustomerId } }).catch(() => {});
  }

  if (createdAdminId) {
    await prisma.user.deleteMany({ where: { id: createdAdminId } }).catch(() => {});
  }
});

test('health endpoint reports the API is running', async () => {
  const result = await request('/api/health');

  assert.equal(result.status, 200);
  assert.equal(result.data.success, true);
  assert.match(result.data.message, /E-commerce API is running/i);
});

test('public product listing and detail requests work', async () => {
  const listResult = await request('/api/products');
  assert.equal(listResult.status, 200);
  assert.ok(Array.isArray(listResult.data));

  const detailResult = await request(`/api/products/${createdProductId}`);
  assert.equal(detailResult.status, 200);
  assert.equal(detailResult.data.id, createdProductId);
});

test('authentication rejects invalid credentials and returns user data', async () => {
  const badLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'missing@example.com', password: 'WrongPassword123!' }),
  });

  assert.equal(badLogin.status, 401);
  assert.match(String(badLogin.data.message || ''), /invalid email or password/i);

  const profile = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${customerToken}` },
  });

  assert.equal(profile.status, 200);
  assert.equal(profile.data.user.role, 'CUSTOMER');
});

test('cart and checkout flow create a valid order', async () => {
  const addToCart = await request('/api/cart', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ productId: createdProductId, quantity: 2 }),
  });

  assert.equal(addToCart.status, 200, 'cart addition should succeed with valid quantity');
  assert.ok(addToCart.data.item);

  const cart = await request('/api/cart', {
    headers: { Authorization: `Bearer ${customerToken}` },
  });

  assert.equal(cart.status, 200);
  assert.ok(Array.isArray(cart.data.items));
  assert.ok(cart.data.items.some((item) => item.product.id === createdProductId));

  const order = await request('/api/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
  });

  assert.equal(order.status, 201, 'checkout should create an order');
  assert.ok(order.data.order?.id, 'order should include an id');

  const customerOrders = await request('/api/orders', {
    headers: { Authorization: `Bearer ${customerToken}` },
  });

  assert.equal(customerOrders.status, 200);
  assert.ok(Array.isArray(customerOrders.data.orders));
  assert.ok(customerOrders.data.orders.some((entry) => entry.id === order.data.order.id));
});

test('admin can list and update orders, and validation rejects bad stock requests', async () => {
  const allOrders = await request('/api/admin/orders', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  assert.equal(allOrders.status, 200);
  assert.ok(Array.isArray(allOrders.data.orders));

  const newestOrder = allOrders.data.orders[0];
  if (newestOrder) {
    const statusUpdate = await request(`/api/admin/orders/${newestOrder.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'PROCESSING' }),
    });

    assert.equal(statusUpdate.status, 200);
    assert.equal(statusUpdate.data.order.status, 'PROCESSING');
  }

  const invalidProduct = await request('/api/products', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name: 'Bad Product', price: -10 }),
  });

  assert.equal(invalidProduct.status, 400);
  assert.match(String(invalidProduct.data.message || ''), /price must be a non-negative number/i);

  const stockError = await request('/api/cart', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ productId: createdProductId, quantity: 999 }),
  });

  assert.equal(stockError.status, 409);
  assert.match(String(stockError.data.message || ''), /exceeds available stock|insufficient stock/i);
});
