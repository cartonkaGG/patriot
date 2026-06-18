/* Patriot Store — User Cabinet */

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

function formatDbDelivery(delivery) {
  if (!delivery) return '—';
  if (delivery.type === 'pickup') return 'Самовивіз · м. Луцьк, ЦУМ';
  if (delivery.type === 'nova_poshta') {
    const branch = delivery.warehouseLabel || '—';
    return `Нова Пошта · ${delivery.city || '—'}, ${branch}`;
  }
  return '—';
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderOrders(orders) {
  const list = document.getElementById('orders-list');
  const empty = document.getElementById('orders-empty');
  const loading = document.getElementById('orders-loading');

  loading.classList.add('hidden');

  if (!orders.length) {
    empty.classList.remove('hidden');
    list.classList.add('hidden');
    return;
  }

  empty.classList.add('hidden');
  list.classList.remove('hidden');
  list.innerHTML = orders.map((o, index) => `
    <article class="cabinet-order-card" style="animation-delay: ${0.05 + index * 0.06}s">
      <div class="cabinet-order-header">
        <span class="cabinet-order-id">#${o.id}</span>
        <time class="cabinet-order-date" datetime="${o.created_at}">${new Date(o.created_at).toLocaleString('uk-UA')}</time>
      </div>
      <div class="cabinet-order-timeline-wrap">
        ${renderOrderTimeline(o.status)}
      </div>
      <div class="cabinet-order-meta">
        <div class="cabinet-order-meta-item">
          <div class="cabinet-order-meta-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </div>
          <div>
            <div class="cabinet-order-meta-label">Доставка</div>
            <div class="cabinet-order-meta-value">${escapeHtml(formatDbDelivery(o.delivery))}</div>
          </div>
        </div>
        <div class="cabinet-order-meta-item">
          <div class="cabinet-order-meta-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
          </div>
          <div>
            <div class="cabinet-order-meta-label">Оплата</div>
            <div class="cabinet-order-meta-value">${o.payment === 'online' ? 'Онлайн' : 'При отриманні'}</div>
          </div>
        </div>
      </div>
      <div class="cabinet-order-items">
        <div class="cabinet-order-items-title">Товари</div>
        ${(o.items || []).map(i => `
          <div class="cabinet-order-item">
            <span class="cabinet-order-item-name">${escapeHtml(i.name)}</span>
            <span class="cabinet-order-item-qty">× ${i.qty}</span>
          </div>
        `).join('')}
      </div>
      <div class="cabinet-order-footer">
        <span class="cabinet-order-total-label">Разом</span>
        <span class="cabinet-order-total">${formatPrice(o.total)}</span>
      </div>
    </article>
  `).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!isSupabaseConfigured()) {
    window.location.href = 'account.html';
    return;
  }

  const user = await requireAuth();
  if (!user) return;

  const profile = await getUserProfile();
  const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Клієнт';
  const phone = profile?.phone || user.user_metadata?.phone || user.phone || '';
  const email = user.email || profile?.email || '';

  document.getElementById('user-greeting').textContent = displayName;
  document.getElementById('user-avatar').textContent = getInitials(displayName);
  document.getElementById('user-email').textContent = email || '';
  document.getElementById('user-phone').textContent = phone || '';
  document.getElementById('user-email').classList.toggle('hidden', !email);
  document.getElementById('user-phone').classList.toggle('hidden', !phone);

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' })
    : '';
  document.getElementById('user-meta').textContent = memberSince ? `Клієнт з ${memberSince}` : '';

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await signOut();
    window.location.href = 'account.html';
  });

  const orders = await fetchUserOrders();
  renderOrders(orders);

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      renderOrders(await fetchUserOrders());
    }
  });
});
