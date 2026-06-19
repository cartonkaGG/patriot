/* Patriot Store — Admin Panel */

const ADMIN_SESSION_KEY = 'patriot-admin-auth';
const ADMIN_REMEMBER_KEY = 'patriot-admin-remember';
const REMEMBER_DAYS = 30;

let editingProductId = null;
let modalMainImage = '';
let modalExtraImages = [];

function compressImageFile(file, maxSize = 1200) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round(height * (maxSize / width));
            width = maxSize;
          } else {
            width = Math.round(width * (maxSize / height));
            height = maxSize;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderMainImagePreview() {
  const preview = document.getElementById('main-image-preview');
  const placeholder = document.getElementById('main-image-placeholder');
  const img = document.getElementById('main-image-preview-img');
  const removeBtn = document.getElementById('main-image-remove');
  if (!preview) return;

  if (modalMainImage) {
    img.src = modalMainImage;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
    removeBtn.classList.remove('hidden');
  } else {
    preview.classList.add('hidden');
    placeholder.classList.remove('hidden');
    removeBtn.classList.add('hidden');
    img.src = '';
  }
}

function renderExtraImagesPreview() {
  const list = document.getElementById('extra-images-list');
  if (!list) return;
  list.innerHTML = modalExtraImages.map((src, index) => `
    <div class="admin-extra-image-item">
      <img src="${src}" alt="">
      <button type="button" class="admin-extra-image-remove cursor-pointer" data-index="${index}" aria-label="Видалити фото">×</button>
    </div>
  `).join('');
}

function resetModalImages() {
  modalMainImage = '';
  modalExtraImages = [];
  const urlInput = document.getElementById('main-image-url');
  const mainFile = document.getElementById('main-image-file');
  const extraFile = document.getElementById('extra-image-file');
  if (urlInput) urlInput.value = '';
  if (mainFile) mainFile.value = '';
  if (extraFile) extraFile.value = '';
  renderMainImagePreview();
  renderExtraImagesPreview();
}

function loadModalImages(product) {
  modalMainImage = product?.image || '';
  modalExtraImages = Array.isArray(product?.images) ? [...product.images] : [];
  const urlInput = document.getElementById('main-image-url');
  if (urlInput) {
    urlInput.value = modalMainImage && !modalMainImage.startsWith('data:') ? modalMainImage : '';
  }
  renderMainImagePreview();
  renderExtraImagesPreview();
}

async function handleImageFiles(files, onReady) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    try {
      onReady(await compressImageFile(file));
    } catch {
      showToast('Не вдалося завантажити зображення');
    }
  }
}

function isAuthenticated() {
  if (sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true') return true;

  try {
    const remembered = localStorage.getItem(ADMIN_REMEMBER_KEY);
    if (remembered) {
      const { until } = JSON.parse(remembered);
      if (Date.now() < until) {
        sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
        return true;
      }
      localStorage.removeItem(ADMIN_REMEMBER_KEY);
    }
  } catch {
    localStorage.removeItem(ADMIN_REMEMBER_KEY);
  }
  return false;
}

function setAuthenticated(remember) {
  sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
  if (remember) {
    localStorage.setItem(ADMIN_REMEMBER_KEY, JSON.stringify({
      until: Date.now() + REMEMBER_DAYS * 24 * 60 * 60 * 1000
    }));
  }
}

function clearAuthentication() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  localStorage.removeItem(ADMIN_REMEMBER_KEY);
}

function showAdmin() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('admin-panel').classList.remove('hidden');
}

function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('admin-panel').classList.add('hidden');
}

function renderAdminTable(filter = '') {
  const tbody = document.getElementById('admin-products-list');
  const q = filter.toLowerCase();

  const filtered = productsCache.filter(p =>
    !q ||
    p.name.toLowerCase().includes(q) ||
    (p.code && p.code.toLowerCase().includes(q)) ||
    getCategoryLabel(p.category).toLowerCase().includes(q)
  );

  tbody.innerHTML = filtered.map(p => `
    <tr>
      <td>
        ${p.image
          ? `<img src="${p.image}" alt="" class="admin-table-thumb">`
          : `<div class="admin-table-thumb admin-table-thumb--empty ${getCategoryImageClass(p.category)}"></div>`}
      </td>
      <td>${p.id}</td>
      <td class="text-xs font-mono text-patriot-muted">${p.code ? escapeHtml(p.code) : '—'}</td>
      <td>
        <a href="${getProductUrl(p.id)}" class="hover:text-patriot-accent transition-colors cursor-pointer font-medium">${p.name}</a>
      </td>
      <td>${getCategoryLabel(p.category)}</td>
      <td>${formatProductPriceHtml(p, 'text-sm')}</td>
      <td><span class="stock-badge ${isProductInStock(p) ? 'stock-badge--in' : 'stock-badge--out'}">${formatStockLabel(p)}</span></td>
      <td>${p.badge ? (p.badge === 'hit' ? 'Хіт' : 'Новинка') : '—'}</td>
      <td>
        <div class="flex gap-2">
          <button class="admin-action-btn cursor-pointer" data-action="edit" data-id="${p.id}">Редагувати</button>
          <button class="admin-action-btn admin-action-delete cursor-pointer" data-action="delete" data-id="${p.id}">Видалити</button>
        </div>
      </td>
    </tr>
  `).join('');

  document.getElementById('stat-total').textContent = productsCache.length;
  document.getElementById('stat-categories').textContent = loadCategories().length;
}

function populateProductCategorySelect(selectedId = 'pneumatic') {
  const select = document.getElementById('product-category-input');
  if (!select) return;
  select.innerHTML = renderCategorySelectOptions(selectedId);
}

function openCategoriesModal() {
  renderCategoriesList();
  const modal = document.getElementById('categories-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.getElementById('new-category-name').focus();
}

function closeCategoriesModal() {
  const modal = document.getElementById('categories-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function renderCategoriesList() {
  const list = document.getElementById('categories-list');
  if (!list) return;

  list.innerHTML = loadCategories(true).map(cat => {
    const count = productsCache.filter(p => p.category === cat.id).length;
    const canDelete = !cat.builtin && count === 0;

    return `
      <div class="admin-category-item">
        <div class="min-w-0">
          <p class="font-medium text-sm">${escapeHtml(cat.label)}</p>
          <p class="text-xs text-patriot-muted">${cat.builtin ? 'Базова' : 'Власна'} · ${count} товарів</p>
        </div>
        ${canDelete
          ? `<button type="button" class="admin-action-btn admin-action-delete cursor-pointer" data-delete-category="${cat.id}">Видалити</button>`
          : '<span class="text-xs text-patriot-muted">—</span>'}
      </div>`;
  }).join('');
}

function handleAddCategory(e) {
  e.preventDefault();
  const input = document.getElementById('new-category-name');
  const result = addCategory(input.value);
  if (result.error) {
    showToast(result.error);
    return;
  }

  input.value = '';
  populateProductCategorySelect(result.category.id);
  renderCategoriesList();
  renderAdminTable(document.getElementById('admin-search').value);
  document.getElementById('stat-categories').textContent = loadCategories().length;
  showToast(`Категорію «${result.category.label}» додано`);
}

function handleDeleteCategory(categoryId) {
  if (!confirm('Видалити цю категорію?')) return;

  const result = deleteCategory(categoryId);
  if (result.error) {
    showToast(result.error);
    return;
  }

  populateProductCategorySelect();
  renderCategoriesList();
  document.getElementById('stat-categories').textContent = loadCategories().length;
  showToast('Категорію видалено');
}

function openModal(product = null) {
  const modal = document.getElementById('product-modal');
  const form = document.getElementById('product-form');

  editingProductId = product ? product.id : null;
  document.getElementById('modal-title').textContent = product ? 'Редагувати товар' : 'Додати товар';

  document.getElementById('product-id').value = product ? product.id : '';
  document.getElementById('product-name-input').value = product ? product.name : '';
  document.getElementById('product-code-input').value = product?.code || '';
  populateProductCategorySelect(product ? product.category : 'pneumatic');
  document.getElementById('product-price-input').value = product ? product.price : '';
  document.getElementById('product-sale-price-input').value = product?.salePrice ?? '';
  document.getElementById('product-stock-input').value = product && product.inStock === false ? 'out_of_stock' : 'in_stock';
  document.getElementById('product-badge-input').value = product ? (product.badge || '') : '';
  document.getElementById('product-desc-input').value = product ? product.description : '';
  document.getElementById('product-full-desc-input').value = product ? (product.fullDescription || '') : '';
  document.getElementById('product-specs-input').value = product && product.specs ? product.specs.join('\n') : '';

  loadModalImages(product);

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  form.querySelector('input:not([type=hidden])').focus();
}

function closeModal() {
  const modal = document.getElementById('product-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  editingProductId = null;
  document.getElementById('product-form').reset();
  resetModalImages();
}

function saveProductFromForm(e) {
  e.preventDefault();
  saveProductFromFormAsync(e);
}

async function saveProductFromFormAsync(e) {
  const specsRaw = document.getElementById('product-specs-input').value.trim();
  const badge = document.getElementById('product-badge-input').value;
  const price = parseInt(document.getElementById('product-price-input').value, 10);
  const saleRaw = document.getElementById('product-sale-price-input').value.trim();
  const salePrice = saleRaw ? parseInt(saleRaw, 10) : null;

  if (salePrice != null && salePrice >= price) {
    showToast('Акційна ціна має бути нижче звичайної');
    return;
  }

  const productData = {
    name: document.getElementById('product-name-input').value.trim(),
    code: document.getElementById('product-code-input').value.trim() || null,
    category: document.getElementById('product-category-input').value,
    price,
    salePrice: salePrice != null && salePrice > 0 ? salePrice : null,
    badge: badge || null,
    description: document.getElementById('product-desc-input').value.trim(),
    fullDescription: document.getElementById('product-full-desc-input').value.trim() || document.getElementById('product-desc-input').value.trim(),
    specs: specsRaw ? specsRaw.split('\n').map(s => s.trim()).filter(Boolean) : [],
    image: modalMainImage || null,
    images: modalExtraImages.filter(Boolean),
    inStock: document.getElementById('product-stock-input').value === 'in_stock'
  };

  const saveBtn = document.querySelector('#product-form button[type="submit"]');
  if (saveBtn) saveBtn.disabled = true;
  showToast('Збереження...');

  try {
    if (editingProductId) {
      const existing = productsCache.find(p => p.id === editingProductId);
      productData.id = editingProductId;
      await persistProduct({ ...existing, ...productData });
      showToast('Товар оновлено');
    } else {
      productData.id = getNextProductId();
      await persistProduct(productData);
      showToast('Товар додано');
    }

    renderAdminTable(document.getElementById('admin-search').value);
    closeModal();
  } catch (err) {
    showToast('Помилка збереження');
    console.error(err);
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

async function deleteProduct(id) {
  const product = productsCache.find(p => p.id === id);
  if (!product) return;
  if (!confirm(`Видалити «${product.name}»?`)) return;

  await removeProduct(id);
  renderAdminTable(document.getElementById('admin-search').value);
  showToast('Товар видалено');
}

function importProducts(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error('Invalid format');
      saveProducts(imported);
      if (getSupabaseAdmin() && typeof syncAllProductsToDb === 'function') {
        await syncAllProductsToDb(imported);
      }
      renderAdminTable();
      showToast(`Імпортовано ${imported.length} товарів`);
    } catch {
      showToast('Помилка імпорту JSON');
    }
  };
  reader.readAsText(file);
}

const ORDER_STATUS_LABELS = Object.fromEntries(
  ORDER_STATUS_OPTIONS.map(o => [o.value, o.label])
);

const ADMIN_PAYMENT_LABELS = {
  online: 'Оплатити зараз',
  on_delivery: 'Оплата при отриманні'
};

let adminOrdersCache = [];
let activeOrderId = null;

function formatOrderDate(iso) {
  return new Date(iso).toLocaleString('uk-UA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatDelivery(order) {
  const d = order?.delivery || {};
  if (d.type === 'pickup') return `Самовивіз · ${d.address || PICKUP_ADDRESS}`;
  if (d.type === 'nova_poshta') {
    const city = d.city || '—';
    const branch = d.warehouseLabel || '—';
    return `Нова Пошта · ${city}, ${branch}`;
  }
  if (d.type === 'ukrposhta') {
    return `Укрпошта · ${d.officeLabel || d.city || '—'}`;
  }
  return '—';
}

function formatDeliveryShort(order) {
  const d = order?.delivery || {};
  if (d.type === 'pickup') return 'Самовивіз';
  if (d.type === 'nova_poshta') return `НП · ${d.city || '—'}`;
  if (d.type === 'ukrposhta') return 'Укрпошта';
  return '—';
}

function getOrderItemsCount(order) {
  return (order.items || []).reduce((sum, i) => sum + (i.qty || 0), 0);
}

function getOrderItemImage(item) {
  if (item?.image) return item.image;
  const product = productsCache?.find(p => p.id === item.id);
  return product?.image || null;
}

function renderOrderStatusBadge(status) {
  const label = ORDER_STATUS_LABELS[status] || status;
  return `<span class="order-status-badge order-status-badge--${status}">${label}</span>`;
}

function isOrderDone(status) {
  return status === 'completed' || status === 'delivered';
}

function isOrderActive(status) {
  return !isOrderDone(status) && status !== 'cancelled' && status !== 'new' && status !== 'awaiting_payment';
}

function populateOrdersStatusFilter() {
  const select = document.getElementById('orders-status-filter');
  if (!select || select.options.length > 1) return;

  ORDER_STATUS_OPTIONS.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.value;
    opt.textContent = s.label;
    select.appendChild(opt);
  });
}

function filterAdminOrders(orders) {
  const query = document.getElementById('orders-search')?.value.trim().toLowerCase() || '';
  const status = document.getElementById('orders-status-filter')?.value || 'all';

  return orders.filter(o => {
    if (status !== 'all' && o.status !== status) return false;
    if (!query) return true;

    const haystack = [
      String(o.id),
      o.customer?.name,
      o.customer?.phone,
      o.customer?.email,
      formatDelivery(o)
    ].filter(Boolean).join(' ').toLowerCase();

    return haystack.includes(query);
  });
}

function updateOrdersStats(orders) {
  document.getElementById('stat-orders').textContent = orders.length;
  document.getElementById('stat-orders-new').textContent = orders.filter(o =>
    o.status === 'new' || o.status === 'awaiting_payment'
  ).length;
  document.getElementById('stat-orders-active').textContent = orders.filter(o =>
    !isOrderDone(o.status) && o.status !== 'cancelled' && o.status !== 'new' && o.status !== 'awaiting_payment'
  ).length;
  document.getElementById('stat-orders-done').textContent = orders.filter(o =>
    isOrderDone(o.status)
  ).length;
}

async function loadAdminOrders() {
  let orders = [];

  try {
    const dbOrders = await fetchAllOrdersFromDb();
    if (dbOrders) {
      orders = dbOrders.map(o => ({
        id: o.id,
        date: o.created_at,
        customer: { name: o.customer_name, phone: o.customer_phone, email: o.customer_email },
        delivery: o.delivery,
        payment: o.payment,
        total: Number(o.total),
        status: o.status,
        items: o.items || [],
        comment: o.comment,
        fromDb: true
      }));
    }
  } catch {
    /* fallback local */
  }

  if (!orders.length) {
    orders = loadOrders().map(o => ({
      id: o.dbId || o.id,
      date: o.date,
      customer: o.customer,
      delivery: o.delivery,
      payment: o.payment,
      total: o.total,
      status: o.status || 'new',
      items: o.items || [],
      comment: o.comment,
      fromDb: Boolean(o.dbId)
    }));
  }

  orders.sort((a, b) => new Date(b.date) - new Date(a.date));
  adminOrdersCache = orders;
  return orders;
}

function renderOrdersTable() {
  renderOrdersTableAsync();
}

async function renderOrdersTableAsync() {
  const tbody = document.getElementById('admin-orders-list');
  const emptyEl = document.getElementById('orders-empty');
  const filterEmptyEl = document.getElementById('orders-filter-empty');
  const tableWrap = tbody.closest('.glass-card');

  populateOrdersStatusFilter();
  const orders = await loadAdminOrders();
  const filtered = filterAdminOrders(orders);

  updateOrdersStats(orders);

  if (orders.length === 0) {
    tableWrap.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    filterEmptyEl.classList.add('hidden');
    tbody.innerHTML = '';
    return;
  }

  emptyEl.classList.add('hidden');

  if (filtered.length === 0) {
    tableWrap.classList.add('hidden');
    filterEmptyEl.classList.remove('hidden');
    tbody.innerHTML = '';
    return;
  }

  tableWrap.classList.remove('hidden');
  filterEmptyEl.classList.add('hidden');

  tbody.innerHTML = filtered.map(o => {
    const itemCount = getOrderItemsCount(o);
    const thumbs = (o.items || []).slice(0, 3).map(item => {
      const src = getOrderItemImage(item);
      return src
        ? `<img src="${src}" alt="" class="admin-order-thumb">`
        : `<span class="admin-order-thumb admin-order-thumb--empty ${getCategoryImageClass(item.category || 'accessories')}"></span>`;
    }).join('');

    return `
    <tr class="order-row" data-id="${o.id}">
      <td class="font-medium whitespace-nowrap">#${o.id}</td>
      <td class="text-xs whitespace-nowrap">${formatOrderDate(o.date)}</td>
      <td>
        <div class="text-sm font-medium">${escapeHtml(o.customer?.name || '—')}</div>
        <div class="text-xs text-patriot-muted">${escapeHtml(o.customer?.phone || '')}</div>
      </td>
      <td>
        <div class="admin-order-thumb-row">${thumbs}</div>
        <div class="text-xs text-patriot-muted mt-1">${itemCount} шт.</div>
      </td>
      <td class="text-xs max-w-[180px]">
        <div>${escapeHtml(formatDeliveryShort(o))}</div>
        <div class="text-patriot-muted">${o.payment === 'online' ? 'Оплата зараз' : 'При отрим.'}</div>
      </td>
      <td class="font-medium whitespace-nowrap">${formatPrice(o.total)}</td>
      <td>${renderOrderStatusBadge(o.status)}</td>
      <td>
        <button type="button" class="admin-action-btn cursor-pointer order-details-btn" data-id="${o.id}">Деталі</button>
      </td>
    </tr>`;
  }).join('');
}

function getAdminOrderById(orderId) {
  return adminOrdersCache.find(o => String(o.id) === String(orderId));
}

function openOrderModal(orderId) {
  const order = getAdminOrderById(orderId);
  if (!order) {
    showToast('Замовлення не знайдено');
    return;
  }

  activeOrderId = order.id;
  const modal = document.getElementById('order-modal');

  document.getElementById('order-modal-title').textContent = `Замовлення #${order.id}`;
  document.getElementById('order-modal-date').textContent = formatOrderDate(order.date);
  document.getElementById('order-modal-timeline').innerHTML = renderOrderTimeline(order.status);

  const customer = order.customer || {};
  document.getElementById('order-modal-customer').innerHTML = `
    <p class="font-medium">${escapeHtml(customer.name || '—')}</p>
    <p class="mt-2"><a href="tel:${(customer.phone || '').replace(/\s/g, '')}" class="text-patriot-accent hover:underline">${escapeHtml(customer.phone || '—')}</a></p>
    ${customer.email ? `<p class="mt-1"><a href="mailto:${customer.email}" class="text-patriot-accent hover:underline">${escapeHtml(customer.email)}</a></p>` : ''}
  `;

  document.getElementById('order-modal-delivery').innerHTML = `
    <p><strong>Доставка:</strong> ${escapeHtml(formatDelivery(order))}</p>
    <p class="mt-2"><strong>Оплата:</strong> ${escapeHtml(ADMIN_PAYMENT_LABELS[order.payment] || order.payment || '—')}</p>
  `;

  document.getElementById('order-modal-items').innerHTML = (order.items || []).map(item => {
    const src = getOrderItemImage(item);
    const thumb = src
      ? `<img src="${src}" alt="" class="admin-order-item-thumb">`
      : `<span class="admin-order-item-thumb admin-order-item-thumb--empty ${getCategoryImageClass(item.category || 'accessories')}"></span>`;

    return `
      <div class="admin-order-item">
        ${thumb}
        <div class="flex-1 min-w-0">
          <p class="font-medium text-sm truncate">${escapeHtml(item.name)}</p>
          <p class="text-xs text-patriot-muted">${item.qty} × ${formatPrice(item.price)}</p>
        </div>
        <span class="font-semibold text-sm whitespace-nowrap">${formatPrice(item.price * item.qty)}</span>
      </div>`;
  }).join('') || '<p class="text-sm text-patriot-muted">Немає товарів</p>';

  document.getElementById('order-modal-total').textContent = formatPrice(order.total);

  const commentWrap = document.getElementById('order-modal-comment-wrap');
  if (order.comment) {
    commentWrap.classList.remove('hidden');
    document.getElementById('order-modal-comment').textContent = order.comment;
  } else {
    commentWrap.classList.add('hidden');
  }

  const statusSelect = document.getElementById('order-modal-status');
  statusSelect.innerHTML = ORDER_STATUS_OPTIONS.map(s =>
    `<option value="${s.value}" ${order.status === s.value ? 'selected' : ''}>${s.label}</option>`
  ).join('');

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeOrderModal() {
  const modal = document.getElementById('order-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  activeOrderId = null;
}

async function saveOrderModalStatus() {
  if (!activeOrderId) return;

  const status = document.getElementById('order-modal-status').value;
  const order = getAdminOrderById(activeOrderId);
  if (!order) return;

  const result = await updateOrderStatus(activeOrderId, status);
  if (result.error) {
    showToast(result.error);
    return;
  }

  order.status = status;
  document.getElementById('order-modal-timeline').innerHTML = renderOrderTimeline(status);
  await renderOrdersTableAsync();
  showToast('Статус оновлено');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showOrderDetails(orderId) {
  openOrderModal(orderId);
}

function initTabs() {
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.add('hidden'));
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`).classList.remove('hidden');

      if (tab.dataset.tab === 'orders') renderOrdersTable();
      if (tab.dataset.tab === 'settings') loadSettingsForm();
    });
  });
}

function loadSettingsForm() {
  const settings = loadSettings();
  document.getElementById('np-api-key').value = settings.npApiKey || '';
  document.getElementById('supabase-url').value = settings.supabaseUrl || '';
  document.getElementById('supabase-anon-key').value = settings.supabaseAnonKey || '';
  document.getElementById('supabase-service-key').value = settings.supabaseServiceKey || '';
}

function saveSettingsForm(e) {
  e.preventDefault();
  const current = loadSettings();
  saveSettings({
    ...current,
    npApiKey: document.getElementById('np-api-key').value.trim()
  });
  showToast('API-ключ збережено');
}

function saveSupabaseForm(e) {
  e.preventDefault();
  const current = loadSettings();
  saveSettings({
    ...current,
    supabaseUrl: document.getElementById('supabase-url').value.trim(),
    supabaseAnonKey: document.getElementById('supabase-anon-key').value.trim(),
    supabaseServiceKey: document.getElementById('supabase-service-key').value.trim()
  });
  supabaseClient = null;
  showToast('Supabase збережено');
}

function savePasswordForm(e) {
  e.preventDefault();
  const newPass = document.getElementById('new-admin-password').value;
  const confirm = document.getElementById('confirm-admin-password').value;

  if (newPass.length < 6) {
    showToast('Пароль має бути мінімум 6 символів');
    return;
  }
  if (newPass !== confirm) {
    showToast('Паролі не збігаються');
    return;
  }

  const current = loadSettings();
  saveSettings({ ...current, adminPassword: newPass });
  document.getElementById('password-form').reset();
  showToast('Пароль змінено');
}

function initAdmin() {
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const password = document.getElementById('admin-password').value;
    const errorEl = document.getElementById('login-error');

    if (password === getAdminPassword()) {
      setAuthenticated(document.getElementById('remember-me').checked);
      errorEl.classList.add('hidden');
      showAdmin();
      renderAdminTable();
    } else {
      errorEl.classList.remove('hidden');
    }
  });

  document.getElementById('btn-logout').addEventListener('click', () => {
    clearAuthentication();
    showLogin();
  });

  document.getElementById('btn-add-product').addEventListener('click', () => openModal());
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('product-form').addEventListener('submit', saveProductFromForm);

  document.getElementById('main-image-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await handleImageFiles([file], (src) => {
      modalMainImage = src;
      document.getElementById('main-image-url').value = '';
      renderMainImagePreview();
    });
    e.target.value = '';
  });

  document.getElementById('main-image-url').addEventListener('change', (e) => {
    const url = e.target.value.trim();
    if (url) {
      modalMainImage = url;
      renderMainImagePreview();
    }
  });

  document.getElementById('main-image-remove').addEventListener('click', () => {
    modalMainImage = '';
    document.getElementById('main-image-url').value = '';
    renderMainImagePreview();
  });

  document.getElementById('extra-image-file').addEventListener('change', async (e) => {
    if (!e.target.files?.length) return;
    await handleImageFiles(Array.from(e.target.files), (src) => {
      modalExtraImages.push(src);
      renderExtraImagesPreview();
    });
    e.target.value = '';
  });

  document.getElementById('extra-images-list').addEventListener('click', (e) => {
    const btn = e.target.closest('.admin-extra-image-remove');
    if (!btn) return;
    modalExtraImages.splice(parseInt(btn.dataset.index, 10), 1);
    renderExtraImagesPreview();
  });

  document.getElementById('product-modal').addEventListener('click', (e) => {
    if (e.target.id === 'product-modal') closeModal();
  });

  document.getElementById('btn-export').addEventListener('click', () => {
    exportProductsJson(productsCache);
    showToast('JSON файл завантажено');
  });

  document.getElementById('btn-import').addEventListener('change', (e) => {
    if (e.target.files[0]) importProducts(e.target.files[0]);
    e.target.value = '';
  });

  document.getElementById('btn-manage-categories').addEventListener('click', openCategoriesModal);
  document.getElementById('categories-modal-close').addEventListener('click', closeCategoriesModal);
  document.getElementById('category-form').addEventListener('submit', handleAddCategory);
  document.getElementById('categories-modal').addEventListener('click', (e) => {
    if (e.target.id === 'categories-modal') closeCategoriesModal();
  });
  document.getElementById('categories-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-delete-category]');
    if (btn) handleDeleteCategory(btn.dataset.deleteCategory);
  });

  document.getElementById('admin-search').addEventListener('input', (e) => {
    renderAdminTable(e.target.value);
  });

  document.getElementById('admin-products-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const id = parseInt(btn.dataset.id, 10);
    if (btn.dataset.action === 'edit') {
      const product = productsCache.find(p => p.id === id);
      if (product) openModal(product);
    } else if (btn.dataset.action === 'delete') {
      deleteProduct(id);
    }
  });

  document.getElementById('admin-orders-list').addEventListener('click', (e) => {
    const btn = e.target.closest('.order-details-btn');
    if (btn) {
      openOrderModal(parseInt(btn.dataset.id, 10));
      return;
    }

    const row = e.target.closest('.order-row');
    if (row) openOrderModal(parseInt(row.dataset.id, 10));
  });

  document.getElementById('orders-search').addEventListener('input', () => renderOrdersTable());
  document.getElementById('orders-status-filter').addEventListener('change', () => renderOrdersTable());
  document.getElementById('orders-refresh').addEventListener('click', () => renderOrdersTableAsync());

  document.getElementById('order-modal-close').addEventListener('click', closeOrderModal);
  document.getElementById('order-modal-save-status').addEventListener('click', saveOrderModalStatus);
  document.getElementById('order-modal').addEventListener('click', (e) => {
    if (e.target.id === 'order-modal') closeOrderModal();
  });

  document.getElementById('settings-form').addEventListener('submit', saveSettingsForm);
  document.getElementById('supabase-form').addEventListener('submit', saveSupabaseForm);
  document.getElementById('password-form').addEventListener('submit', savePasswordForm);

  document.getElementById('toggle-np-key').addEventListener('click', () => {
    const input = document.getElementById('np-api-key');
    const btn = document.getElementById('toggle-np-key');
    if (input.type === 'password') {
      input.type = 'text';
      btn.textContent = 'Приховати';
    } else {
      input.type = 'password';
      btn.textContent = 'Показати';
    }
  });

  initTabs();
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
  loadCategories();
  populateProductCategorySelect();
  initAdmin();

  if (isAuthenticated()) {
    showAdmin();
    renderAdminTable();
  }
});
