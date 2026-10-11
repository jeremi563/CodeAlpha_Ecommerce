import { api, getSession, saveSession, showToast } from './api.js';
import './site.js';

const session = getSession();
if (!session?.token) {
  location.replace('/login.html?next=/account.html');
}

const container = document.querySelector('#account-content');

async function renderAccount() {
  try {
    const response = await api('/api/auth/me');
    const user = response.user;

    container.innerHTML = `
      <section class="dashboard-panel">
        <span class="account-highlight">Profile</span>
        <h2>${escapeHtml(user.name)}</h2>
        <p>Your account details are kept private and are only used to manage your orders and secure checkout.</p>
        <form id="account-form" class="profile-form">
          <div class="field-row">
            <label>
              Full name
              <input name="name" type="text" value="${escapeHtml(user.name)}" maxlength="80" required>
            </label>
            <label>
              Email address
              <input name="email" type="email" value="${escapeHtml(user.email)}" disabled>
            </label>
          </div>
          <label>
            New password
            <input name="password" type="password" placeholder="Leave blank to keep current password" autocomplete="new-password">
          </label>
          <div class="account-actions">
            <button class="button button-dark" type="submit">Save changes</button>
            <a class="button button-light" href="/dashboard.html">Back to dashboard</a>
          </div>
        </form>
      </section>
      <aside class="account-card">
        <h2>Account status</h2>
        <ul class="account-status-list">
          <li><span>Role</span><strong>${escapeHtml(user.role)}</strong></li>
          <li><span>Sign in status</span><strong>Active</strong></li>
          <li><span>Security</span><strong>Protected</strong></li>
        </ul>
      </aside>
    `;

    const form = document.querySelector('#account-form');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = Object.fromEntries(new FormData(form));
      const payload = {};

      if (String(formData.name).trim() && String(formData.name).trim() !== user.name) {
        payload.name = String(formData.name).trim();
      }

      if (String(formData.password).trim()) {
        payload.password = String(formData.password).trim();
      }

      if (!Object.keys(payload).length) {
        showToast('No account changes were made.', true);
        return;
      }

      try {
        const response = await api('/api/auth/me', {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        saveSession(response);
        showToast('Account updated successfully.');
        await renderAccount();
      } catch (error) {
        showToast(error.message, true);
      }
    });
  } catch (error) {
    container.innerHTML = `<div class="empty-state"><h2>We could not load your account.</h2><p>${escapeHtml(error.message)}</p><a class="button button-dark" href="/products.html">Back to shop</a></div>`;
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

await renderAccount();
