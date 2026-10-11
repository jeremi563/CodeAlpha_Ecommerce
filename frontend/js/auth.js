import { api, getSession, saveSession } from './api.js';
import './site.js';

const form = document.querySelector('#login-form') || document.querySelector('#register-form');
if (!form) {
  throw new Error('Authentication form not found.');
}

const isRegistration = form.id === 'register-form';
const message = form.querySelector('.form-message');
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;

if (getSession()?.token) location.replace('/');

bindPasswordToggles();
setupGoogleButton();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = '';
  message.classList.remove('success');

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  const values = Object.fromEntries(new FormData(form));

  try {
    if (values.password && !passwordPattern.test(String(values.password))) {
      throw new Error('Password must be 8-72 characters and include uppercase, lowercase, a number, and a symbol.');
    }

    const session = await api(`/api/auth/${isRegistration ? 'register' : 'login'}`, {
      method: 'POST',
      body: JSON.stringify(values),
    });
    saveSession(session);
    location.assign(postAuthDestination());
  } catch (error) {
    message.textContent = error.message;
    button.disabled = false;
  }
});

function bindPasswordToggles() {
  form.querySelectorAll('input[type="password"]').forEach((input) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'password-wrap';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'password-toggle';
    toggle.setAttribute('aria-label', 'Show password');
    toggle.textContent = 'Show';

    input.parentElement.insertBefore(wrapper, input.nextSibling);
    wrapper.appendChild(input);
    wrapper.appendChild(toggle);

    toggle.addEventListener('click', () => {
      const shouldShow = input.type === 'password';
      input.type = shouldShow ? 'text' : 'password';
      toggle.textContent = shouldShow ? 'Hide' : 'Show';
      toggle.setAttribute('aria-label', shouldShow ? 'Hide password' : 'Show password');
    });
  });
}

function setupGoogleButton() {
  const googleButton = document.querySelector('#google-signin');
  if (!googleButton) return;

  const container = document.createElement('div');
  container.id = googleButton.id;
  container.className = 'google-auth-button';
  container.setAttribute('aria-label', 'Sign in with Google');
  container.setAttribute('aria-busy', 'true');
  container.textContent = 'Loading Google sign-in...';
  googleButton.replaceWith(container);

  api('/api/auth/google/config')
    .then(async ({ clientId }) => {
      if (!clientId) {
        container.hidden = true;
        message.textContent = 'Google sign-in is not configured yet. Email sign-in is available.';
        return;
      }

      await loadGoogleIdentityServices();
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: completeGoogleSignIn,
      });
      container.replaceChildren();
      container.setAttribute('aria-busy', 'false');
      window.google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: Math.min(Math.max(container.clientWidth, 200), 400),
      });
    })
    .catch((error) => {
      container.hidden = true;
      message.textContent = error.message || 'Google sign-in could not be loaded.';
    });
}

function loadGoogleIdentityServices() {
  if (window.google?.accounts?.id) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Google sign-in could not be loaded.'));
    document.head.appendChild(script);
  });
}

async function completeGoogleSignIn(response) {
  try {
    const session = await api('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential: response.credential }),
    });
    saveSession(session);
    location.assign(postAuthDestination());
  } catch (error) {
    message.textContent = error.message;
  }
}

function postAuthDestination() {
  const next = new URLSearchParams(location.search).get('next');
  const nextPath = next?.split(/[?#]/, 1)[0];
  const isHome = nextPath === '/' || nextPath === '/index.html';
  return next?.startsWith('/') && !next.startsWith('//') && !isHome ? next : '/dashboard.html';
}