import { api, getSession, saveSession } from './api.js';
import './site.js';

const form = document.querySelector('#login-form') || document.querySelector('#register-form');
const isRegistration = form.id === 'register-form';
const message = form.querySelector('.form-message');

if (getSession()?.token) location.replace('/');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = '';
  message.classList.remove('success');
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  const values = Object.fromEntries(new FormData(form));

  try {
    const session = await api(`/api/auth/${isRegistration ? 'register' : 'login'}`, {
      method: 'POST',
      body: JSON.stringify(values),
    });
    saveSession(session);
    const next = new URLSearchParams(location.search).get('next');
    const safeNext = next?.startsWith('/') && !next.startsWith('//') ? next : '/';
    location.assign(safeNext);
  } catch (error) {
    message.textContent = error.message;
    button.disabled = false;
  }
});