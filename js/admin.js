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
    CATEGORY_LABELS[p.category].toLowerCase().includes(q)
  );

  tbody.innerHTML = filtered.map(p => `
    <tr>
      <td>
        ${p.image
          ? `<img src="${p.image}" alt="" class="admin-table-thumb">`
          : `<div class="admin-table-thumb admin-table-thumb--empty img-${p.category}"></div>`}
      </td>
      <td>${p.id}</td>
      <td>
        <a href="${getProductUrl(p.id)}" class="hover:text-patriot-accent transition-colors cursor-pointer font-medium">${p.name}</a>
      </td>
      <td>${CATEGORY_LABELS[p.category]}</td>
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
  document.getElementById('stat-categories').textContent = new Set(productsCache.map(p => p.category)).size;
}

function openModal(product = null) {
  const modal = document.getElementById('product-modal');
  const form = document.getElementById('product-form');

  editingProductId = product ? product.id : null;
  document.getElementById('modal-title').textContent = product ? 'Редагувати товар' : 'Додати товар';

  document.getElementById('product-id').value = product ? product.id : '';
  document.getElementById('product-name-input').value = product ? product.name : '';
  document.getElementById('product-category-input').value = product ? product.category : 'pneumatic';
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

async function syncCatalogToDb() {
  if (!getSupabaseAdmin()) {
    showToast('Потрібен Service Role Key у налаштуваннях');
    return;
  }
  if (!confirm('Завантажити всі товари та фото в Supabase?')) return;

  showToast('Синхронізація з БД...');
  const { synced, error } = await syncAllProductsToDb(productsCache);
  if (error) {
    showToast('Помилка: ' + error);
    return;
  }

  productsCache = null;
  await loadProducts(true);
  renderAdminTable(document.getElementById('admin-search').value);
  showToast(`Синхронізовано ${synced} товарів`);
}

async function resetProducts() {
  if (!confirm('Скинути каталог до початкового стану з products.json?')) return;

  localStorage.removeItem(STORAGE_PRODUCTS_KEY);
  productsCache = null;
  await loadProducts();
  renderAdminTable();
  showToast('Каталог скинуто');
}

function importProducts(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error('Invalid format');
      saveProducts(imported);
      if (typeof syncAllProductsToDb === 'function') {
        showToast('Синхронізація з БД...');
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

function formatOrderDate(iso) {
  return new Date(iso).toLocaleString('uk-UA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatDelivery(order) {
  const d = order?.delivery || {};
  if (d.type === 'pickup') return 'Самовивіз';
  if (d.type === 'nova_poshta') {
    const city = d.city || '—';
    const branch = d.warehouseLabel || '—';
    return `НП: ${city}, ${branch}`;
  }
  if (d.type === 'ukrposhta') {
    return `Укрпошта: ${d.officeLabel || d.city || '—'}`;
  }
  return '—';
}

function renderOrdersTable() {
  renderOrdersTableAsync();
}

async function renderOrdersTableAsync() {
  const tbody = document.getElementById('admin-orders-list');
  const emptyEl = document.getElementById('orders-empty');
  const tableWrap = tbody.closest('.glass-card');

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
        items: o.items,
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
      status: o.status,
      items: o.items,
      comment: o.comment,
      fromDb: Boolean(o.dbId)
    }));
  }

  document.getElementById('stat-orders').textContent = orders.length;

  if (orders.length === 0) {
    tableWrap.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    return;
  }

  tableWrap.classList.remove('hidden');
  emptyEl.classList.add('hidden');

  tbody.innerHTML = orders.map(o => `
    <tr class="cursor-pointer order-row" data-id="${o.id}">
      <td class="font-medium">#${o.id}</td>
      <td class="text-xs whitespace-nowrap">${formatOrderDate(o.date)}</td>
      <td>
        <div class="text-sm font-medium">${o.customer.name}</div>
        <div class="text-xs text-patriot-muted">${o.customer.phone}</div>
      </td>
      <td class="text-xs max-w-[200px] truncate" title="${formatDelivery(o)}">${formatDelivery(o)}</td>
      <td class="text-xs">${o.payment === 'online' ? 'Зараз' : 'При отрим.'}</td>
      <td class="font-medium whitespace-nowrap">${formatPrice(o.total)}</td>
      <td>
        <select class="admin-input order-status-select cursor-pointer" data-order-id="${o.id}" data-from-db="${o.fromDb ? '1' : '0'}" aria-label="Статус замовлення">
          ${ORDER_STATUS_OPTIONS.map(s => `<option value="${s.value}" ${o.status === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
        </select>
      </td>
    </tr>
  `).join('');
}

function showOrderDetails(orderId) {
  const order = loadOrders().find(o => o.id === orderId);
  if (!order) {
    showToast('Деталі замовлення доступні в Supabase Dashboard');
    return;
  }

  const items = order.items.map(i => `• ${i.name} × ${i.qty} — ${formatPrice(i.price * i.qty)}`).join('\n');
  alert(
    `Замовлення #${order.id}\n` +
    `Дата: ${formatOrderDate(order.date)}\n` +
    `Клієнт: ${order.customer.name}\n` +
    `Тел: ${order.customer.phone}\n` +
    `Email: ${order.customer.email || '—'}\n` +
    `Доставка: ${formatDelivery(order)}\n` +
    `Оплата: ${order.payment === 'online' ? 'Оплатити зараз' : 'При отриманні'}\n` +
    `Коментар: ${order.comment || '—'}\n\n` +
    `Товари:\n${items}\n\n` +
    `Разом: ${formatPrice(order.total)}`
  );
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

  document.getElementById('btn-reset').addEventListener('click', resetProducts);
  document.getElementById('btn-sync-db').addEventListener('click', syncCatalogToDb);

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
    if (e.target.closest('.order-status-select')) return;
    const row = e.target.closest('.order-row');
    if (row) showOrderDetails(parseInt(row.dataset.id, 10));
  });

  document.getElementById('admin-orders-list').addEventListener('change', async (e) => {
    const select = e.target.closest('.order-status-select');
    if (!select) return;

    const orderId = parseInt(select.dataset.orderId, 10);
    const status = select.value;
    const fromDb = select.dataset.fromDb === '1';

    const result = await updateOrderStatus(orderId, status);
    if (result.error) {
      showToast(result.error);
      renderOrdersTable();
      return;
    }

    if (!fromDb) {
      renderOrdersTable();
    }

    showToast('Статус оновлено');
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
  initAdmin();

  if (isAuthenticated()) {
    showAdmin();
    renderAdminTable();
  }
});
