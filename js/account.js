/* Patriot Store — Account page */

function showAuthMessage(text, isError = false) {
  const el = document.getElementById('auth-message');
  el.textContent = text;
  el.className = `auth-message ${isError ? 'error' : 'success'}`;
  el.classList.remove('hidden');
}

function hideAuthMessage() {
  const el = document.getElementById('auth-message');
  el.classList.add('hidden');
}

function switchTab(tab) {
  const isLogin = tab === 'login';
  const tabsEl = document.getElementById('auth-tabs');

  document.getElementById('panel-login').classList.toggle('active', isLogin);
  document.getElementById('panel-register').classList.toggle('active', !isLogin);
  document.getElementById('tab-login').classList.toggle('active', isLogin);
  document.getElementById('tab-register').classList.toggle('active', !isLogin);
  tabsEl.dataset.active = tab;

  hideAuthMessage();
  document.getElementById('resend-email-block').classList.add('hidden');

  const panel = isLogin ? document.getElementById('panel-login') : document.getElementById('panel-register');
  panel.querySelectorAll('.auth-field').forEach((field, i) => {
    field.style.animation = 'none';
    field.offsetHeight;
    field.style.animation = '';
    field.style.animationDelay = `${0.05 + i * 0.05}s`;
  });
}

function setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
  btn.textContent = loading ? 'Зачекайте...' : btn.dataset.originalText;
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!isSupabaseConfigured()) {
    document.getElementById('db-not-configured').classList.remove('hidden');
  }

  const user = await getCurrentUser();
  if (user) {
    window.location.href = getPageRedirect();
    return;
  }

  document.getElementById('tab-login').addEventListener('click', () => switchTab('login'));
  document.getElementById('tab-register').addEventListener('click', () => switchTab('register'));

  document.getElementById('google-btn').addEventListener('click', async () => {
    const btn = document.getElementById('google-btn');
    setLoading(btn, true);
    try {
      await signInWithGoogle();
    } catch (err) {
      showAuthMessage(err.message, true);
      setLoading(btn, false);
    }
  });

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-submit-btn');
    const email = document.getElementById('login-email').value.trim();
    setLoading(btn, true);
    hideAuthMessage();

    try {
      await signIn(email, document.getElementById('login-password').value);
      window.location.href = getPageRedirect();
    } catch (err) {
      setLoading(btn, false);
      if (err.message === 'email_not_confirmed') {
        document.getElementById('resend-email-block').classList.remove('hidden');
        document.getElementById('resend-email-btn').dataset.email = email;
        showAuthMessage('Підтвердіть email — перевірте пошту та спам.', true);
      } else {
        showAuthMessage(err.message, true);
      }
    }
  });

  document.getElementById('resend-email-btn').addEventListener('click', async () => {
    const email = document.getElementById('resend-email-btn').dataset.email ||
      document.getElementById('login-email').value.trim();
    try {
      await resendEmailConfirmation(email);
      showAuthMessage('Лист підтвердження надіслано на ' + email);
    } catch (err) {
      showAuthMessage(err.message, true);
    }
  });

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('.auth-submit');
    setLoading(btn, true);
    hideAuthMessage();

    try {
      const data = await signUp(
        document.getElementById('reg-email').value.trim(),
        document.getElementById('reg-password').value,
        document.getElementById('reg-name').value.trim(),
        document.getElementById('reg-phone').value.trim()
      );

      setLoading(btn, false);

      if (data.session) {
        showAuthMessage('Реєстрація успішна! Переходимо в кабінет...');
        setTimeout(() => { window.location.href = getPageRedirect(); }, 900);
      } else {
        showAuthMessage('Акаунт створено! Перевірте email для підтвердження.');
        switchTab('login');
      }
    } catch (err) {
      setLoading(btn, false);
      showAuthMessage(err.message, true);
    }
  });
});
