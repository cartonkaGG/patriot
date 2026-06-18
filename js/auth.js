/* Patriot Store — Authentication */

const AUTH_ERROR_UA = {
  'Email not confirmed': 'email_not_confirmed',
  'Invalid login credentials': 'Невірний email/телефон або пароль',
  'User already registered': 'Користувач уже зареєстрований. Спробуйте увійти.',
  'Password should be at least 6 characters': 'Пароль має бути мінімум 6 символів',
  'Unable to validate email address: invalid format': 'Невірний формат email',
  'Signups not allowed for otp': 'Вхід по телефону ще не налаштований в Supabase (потрібен SMS-провайдер)',
  'Token has expired or is invalid': 'Код прострочений або невірний. Запишіть новий.',
  'Phone number is invalid': 'Невірний номер телефону. Формат: +380991234567'
};

function translateAuthError(error) {
  if (!error) return 'Помилка авторизації';
  const msg = error.message || String(error);
  if (AUTH_ERROR_UA[msg] === 'email_not_confirmed') return 'email_not_confirmed';
  return AUTH_ERROR_UA[msg] || msg;
}

function normalizeUaPhone(phone) {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('380')) digits = '+' + digits;
  else if (digits.startsWith('0')) digits = '+38' + digits;
  else if (digits.length === 9) digits = '+380' + digits;
  else if (!phone.startsWith('+')) digits = '+' + digits;
  else digits = phone.replace(/\s/g, '');
  return digits;
}

function getAuthRedirectUrl() {
  const base = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
  return base + 'auth-callback.html';
}

async function getCurrentUser() {
  const client = getSupabase();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session?.user || null;
}

async function getUserProfile() {
  const client = getSupabase();
  const user = await getCurrentUser();
  if (!client || !user) return null;

  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) return null;
  return data;
}

async function ensureProfile(user, fullName, phone) {
  const client = getSupabase();
  if (!client || !user) return;

  const meta = user.user_metadata || {};
  await client.from('profiles').upsert({
    id: user.id,
    full_name: fullName || meta.full_name || meta.name || '',
    phone: phone ? normalizeUaPhone(phone) : (meta.phone || ''),
    email: user.email || meta.email || null,
    updated_at: new Date().toISOString()
  });
}

async function signUp(email, password, fullName, phone) {
  const client = getSupabase();
  if (!client) throw new Error('База даних не налаштована.');

  const normalizedPhone = normalizeUaPhone(phone);

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
      data: {
        full_name: fullName,
        phone: normalizedPhone
      }
    }
  });

  if (error) throw new Error(translateAuthError(error));

  if (data.user) {
    await ensureProfile(data.user, fullName, normalizedPhone);
  }

  return data;
}

async function signIn(email, password) {
  const client = getSupabase();
  if (!client) throw new Error('База даних не налаштована.');

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    const translated = translateAuthError(error);
    if (translated === 'email_not_confirmed') {
      const err = new Error('email_not_confirmed');
      err.email = email;
      throw err;
    }
    throw new Error(translated);
  }
  return data;
}

async function resendEmailConfirmation(email) {
  const client = getSupabase();
  if (!client) throw new Error('База даних не налаштована.');

  const { error } = await client.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: getAuthRedirectUrl() }
  });

  if (error) throw new Error(translateAuthError(error));
}

async function signInWithGoogle() {
  const client = getSupabase();
  if (!client) throw new Error('База даних не налаштована.');

  const redirectTo = getAuthRedirectUrl() + '?redirect=' + encodeURIComponent(getPageRedirect());

  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: { access_type: 'offline', prompt: 'consent' }
    }
  });

  if (error) throw new Error(translateAuthError(error));
}

async function sendPhoneOtp(phone, fullName = '') {
  const client = getSupabase();
  if (!client) throw new Error('База даних не налаштована.');

  const normalized = normalizeUaPhone(phone);

  const { error } = await client.auth.signInWithOtp({
    phone: normalized,
    options: {
      shouldCreateUser: true,
      data: fullName ? { full_name: fullName, phone: normalized } : { phone: normalized }
    }
  });

  if (error) throw new Error(translateAuthError(error));
  return normalized;
}

async function verifyPhoneOtp(phone, token) {
  const client = getSupabase();
  if (!client) throw new Error('База даних не налаштована.');

  const normalized = normalizeUaPhone(phone);

  const { data, error } = await client.auth.verifyOtp({
    phone: normalized,
    token: token.trim(),
    type: 'sms'
  });

  if (error) throw new Error(translateAuthError(error));

  if (data.user) {
    await ensureProfile(data.user, data.user.user_metadata?.full_name, normalized);
  }

  return data;
}

async function linkEmailToAccount(email) {
  const client = getSupabase();
  const user = await getCurrentUser();
  if (!client || !user) throw new Error('Увійдіть в акаунт');

  const { error } = await client.auth.updateUser({ email });
  if (error) throw new Error(translateAuthError(error));
}

async function signOut() {
  const client = getSupabase();
  if (!client) return;
  await client.auth.signOut();
}

async function updateUserProfile(fullName, phone, email) {
  const client = getSupabase();
  const user = await getCurrentUser();
  if (!client || !user) throw new Error('Увійдіть в акаунт');

  const normalizedPhone = phone ? normalizeUaPhone(phone) : '';

  const { error } = await client
    .from('profiles')
    .upsert({
      id: user.id,
      full_name: fullName,
      phone: normalizedPhone,
      email: email || user.email || null,
      updated_at: new Date().toISOString()
    });

  if (error) throw new Error(error.message);

  await client.auth.updateUser({
    data: { full_name: fullName, phone: normalizedPhone }
  });

  if (email && email !== user.email && user.app_metadata?.provider !== 'google') {
    await linkEmailToAccount(email);
  }
}

async function requireAuth(redirectTo = 'account.html') {
  const user = await getCurrentUser();
  if (!user) {
    const dest = window.location.pathname.includes('account') ? 'cabinet.html' : (window.location.pathname + window.location.search);
    window.location.href = `${redirectTo}?redirect=${encodeURIComponent(dest)}`;
    return null;
  }
  return user;
}

function getPageRedirect() {
  const params = new URLSearchParams(window.location.search);
  return params.get('redirect') || 'cabinet.html';
}

function updateAuthNav() {
  const profileLink = document.getElementById('auth-profile-link');
  const mobileLink = document.getElementById('auth-mobile-link');
  if (!profileLink && !mobileLink) return;

  function applyAuthState(user) {
    const loggedIn = !!user;
    const href = loggedIn ? 'cabinet.html' : 'account.html';
    const label = loggedIn ? 'Кабінет' : 'Увійти';

    if (profileLink) {
      profileLink.href = href;
      profileLink.title = label;
      profileLink.setAttribute('aria-label', loggedIn ? 'Особистий кабінет' : 'Увійти');
    }

    if (mobileLink) {
      mobileLink.href = href;
      mobileLink.textContent = loggedIn ? 'Особистий кабінет' : 'Увійти';
    }
  }

  const client = getSupabase();
  if (client) {
    client.auth.getSession().then(({ data }) => applyAuthState(data.session?.user));
    client.auth.onAuthStateChange((_event, session) => applyAuthState(session?.user));
  } else {
    applyAuthState(null);
  }
}
