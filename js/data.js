/* Patriot Store — Data Layer */

const STORAGE_PRODUCTS_KEY = 'patriot-products';
const STORAGE_CART_KEY = 'patriot-cart';
const STORAGE_ORDERS_KEY = 'patriot-orders';
const STORAGE_SETTINGS_KEY = 'patriot-settings';
const STORAGE_CATEGORIES_KEY = 'patriot-categories';

const PICKUP_ADDRESS = 'м. Луцьк, проспект Волі, 1, ЦУМ 5 поверх';

const DEFAULT_CATEGORIES = [
  { id: 'pneumatic', label: 'Пневматика', builtin: true },
  { id: 'statues', label: 'Статуетки', builtin: true },
  { id: 'zippo', label: 'Zippo', builtin: true },
  { id: 'defense', label: 'Самооборона', builtin: true },
  { id: 'accessories', label: 'Аксесуари', builtin: true }
];

const BUILTIN_CATEGORY_IDS = new Set(DEFAULT_CATEGORIES.map(c => c.id));

const CATEGORY_LABELS = Object.fromEntries(DEFAULT_CATEGORIES.map(c => [c.id, c.label]));

let categoriesCache = null;

const CATEGORY_ICONS = {
  pneumatic: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>',
  statues: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>',
  zippo: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/>',
  defense: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>',
  accessories: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"/>'
};

function invalidateCategoriesCache() {
  categoriesCache = null;
}

function getCustomCategories() {
  try {
    const stored = localStorage.getItem(STORAGE_CATEGORIES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCustomCategories(categories) {
  localStorage.setItem(STORAGE_CATEGORIES_KEY, JSON.stringify(categories));
  invalidateCategoriesCache();
}

function loadCategories(forceReload = false) {
  if (categoriesCache && !forceReload) return categoriesCache;

  const custom = getCustomCategories();
  const merged = [...DEFAULT_CATEGORIES];
  const ids = new Set(DEFAULT_CATEGORIES.map(c => c.id));

  custom.forEach(c => {
    if (c?.id && c?.label && !ids.has(c.id)) {
      merged.push({ id: c.id, label: c.label, builtin: false });
      ids.add(c.id);
    }
  });

  if (productsCache) {
    productsCache.forEach(p => {
      if (p.category && !ids.has(p.category)) {
        merged.push({ id: p.category, label: p.category, builtin: false, auto: true });
        ids.add(p.category);
      }
    });
  }

  categoriesCache = merged;
  return categoriesCache;
}

function getCategoryLabel(categoryId) {
  const cat = loadCategories().find(c => c.id === categoryId);
  return cat?.label || categoryId || '—';
}

function getCategoryImageClass(category) {
  return BUILTIN_CATEGORY_IDS.has(category) ? `img-${category}` : 'img-custom';
}

function transliterateSlug(name) {
  const map = {
    а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ye', ж: 'zh', з: 'z',
    и: 'y', і: 'i', ї: 'yi', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
    р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh',
    щ: 'shch', ь: '', ю: 'yu', я: 'ya', ы: 'y', э: 'e', ё: 'yo', ъ: ''
  };
  return name.toLowerCase().split('').map(ch => map[ch] ?? ch).join('');
}

function slugifyCategory(name) {
  let slug = transliterateSlug(name.trim())
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) slug = 'category';

  const existing = new Set(loadCategories(true).map(c => c.id));
  if (!existing.has(slug)) return slug;

  let i = 2;
  while (existing.has(`${slug}-${i}`)) i++;
  return `${slug}-${i}`;
}

function addCategory(label) {
  const trimmed = label.trim();
  if (!trimmed) return { error: 'Вкажіть назву категорії' };

  if (loadCategories().some(c => c.label.toLowerCase() === trimmed.toLowerCase())) {
    return { error: 'Така категорія вже існує' };
  }

  const id = slugifyCategory(trimmed);
  const custom = getCustomCategories();
  custom.push({ id, label: trimmed });
  saveCustomCategories(custom);
  return { error: null, category: { id, label: trimmed, builtin: false } };
}

function deleteCategory(categoryId) {
  if (BUILTIN_CATEGORY_IDS.has(categoryId)) {
    return { error: 'Базову категорію не можна видалити' };
  }
  if (productsCache?.some(p => p.category === categoryId)) {
    return { error: 'У цій категорії є товари. Спочатку перенесіть їх.' };
  }

  saveCustomCategories(getCustomCategories().filter(c => c.id !== categoryId));
  return { error: null };
}

function renderCategorySelectOptions(selectedId = '') {
  return loadCategories().map(c =>
    `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.label}</option>`
  ).join('');
}

function hasProductCode(product) {
  return Boolean(product?.code?.trim());
}

const STORE_CONTACTS = {
  phone: '+380997577214',
  email: 'info@patriot-store.ua',
  address: PICKUP_ADDRESS
};

function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_SETTINGS_KEY);
    return stored ? JSON.parse(stored) : {
      npApiKey: '',
      adminPassword: '',
      supabaseUrl: '',
      supabaseAnonKey: '',
      supabaseServiceKey: ''
    };
  } catch {
    return { npApiKey: '', adminPassword: '', supabaseUrl: '', supabaseAnonKey: '', supabaseServiceKey: '' };
  }
}

function getAdminPassword() {
  const settings = loadSettings();
  return settings.adminPassword || 'patriot2026';
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
}

function loadOrders() {
  try {
    const stored = localStorage.getItem(STORAGE_ORDERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveOrder(order) {
  const orders = loadOrders();
  orders.unshift(order);
  localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(orders));
  return order;
}

function linkOrderToDatabase(localId, dbId) {
  const orders = loadOrders();
  const order = orders.find(o => o.id === localId);
  if (!order) return;
  order.dbId = dbId;
  localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(orders));
}

function updateOrderStatusLocal(orderId, status) {
  const orders = loadOrders();
  let changed = false;
  const next = orders.map(o => {
    if (o.id === orderId || o.dbId === orderId) {
      changed = true;
      return { ...o, status };
    }
    return o;
  });
  if (changed) {
    localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(next));
  }
}

function getNextOrderId() {
  const orders = loadOrders();
  if (orders.length === 0) return 1001;
  return Math.max(...orders.map(o => o.id)) + 1;
}

let productsCache = null;

function formatPrice(price) {
  return Number(price).toLocaleString('uk-UA') + ' ₴';
}

function hasSalePrice(product) {
  return product?.salePrice != null && product.salePrice > 0 && product.salePrice < product.price;
}

function getEffectivePrice(product) {
  return hasSalePrice(product) ? product.salePrice : product.price;
}

function formatProductPriceHtml(product, sizeClass = '') {
  if (hasSalePrice(product)) {
    return `<span class="price-sale ${sizeClass}">${formatPrice(product.salePrice)}</span><span class="price-old">${formatPrice(product.price)}</span>`;
  }
  return `<span class="price-regular ${sizeClass}">${formatPrice(product.price)}</span>`;
}

function isProductInStock(product) {
  return product?.inStock !== false;
}

function formatStockLabel(product) {
  return isProductInStock(product) ? 'В наявності' : 'Немає в наявності';
}

function renderCartItemThumb(item, extraClass = '') {
  const imageClass = ['cart-item-image', extraClass].filter(Boolean).join(' ');

  if (item.image) {
    return `
      <a href="${getProductUrl(item.id)}" class="${imageClass} cart-item-image--photo cursor-pointer flex-shrink-0">
        <img src="${item.image}" alt="" loading="lazy">
      </a>`;
  }

  return `
    <a href="${getProductUrl(item.id)}" class="${imageClass} ${getCategoryImageClass(item.category)} cursor-pointer flex-shrink-0">
      <svg class="w-6 h-6 text-patriot-accent/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        ${getProductIcon(item.category)}
      </svg>
    </a>`;
}

function getProductGallery(product) {
  const gallery = [];
  if (product?.image) gallery.push(product.image);
  if (Array.isArray(product?.images)) {
    product.images.filter(Boolean).forEach(src => {
      if (!gallery.includes(src)) gallery.push(src);
    });
  }
  return gallery;
}

function renderProductVisual(product, options = {}) {
  const {
    className = 'product-image',
    iconClass = 'product-icon',
    showBadge = true,
    imgClass = 'product-photo'
  } = options;

  const badgeHtml = showBadge && product.badge
    ? `<span class="product-badge ${product.badge}">${product.badge === 'hit' ? 'Хіт' : 'Новинка'}</span>`
    : '';

  if (product.image) {
    return `
      <div class="${className} product-image--photo">
        ${badgeHtml}
        <img src="${product.image}" alt="" class="${imgClass}" loading="lazy">
      </div>`;
  }

  return `
    <div class="${className} ${getCategoryImageClass(product.category)}">
      ${badgeHtml}
      <svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        ${getProductIcon(product.category)}
      </svg>
    </div>`;
}

function getProductIcon(category) {
  return CATEGORY_ICONS[category] || CATEGORY_ICONS.accessories;
}

function getProductUrl(id) {
  return `product.html?id=${id}`;
}

async function loadProducts(forceReload = false) {
  if (productsCache && !forceReload) return productsCache;

  if (typeof fetchProductsFromDb === 'function' && typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
    const dbProducts = await fetchProductsFromDb();
    if (dbProducts && dbProducts.length > 0) {
      productsCache = dbProducts;
      invalidateCategoriesCache();
      localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(productsCache));
      return productsCache;
    }
  }

  const stored = localStorage.getItem(STORAGE_PRODUCTS_KEY);
  if (stored) {
    try {
      productsCache = JSON.parse(stored);
      invalidateCategoriesCache();
      return productsCache;
    } catch {
      localStorage.removeItem(STORAGE_PRODUCTS_KEY);
    }
  }

  try {
    const res = await fetch('data/products.json');
    if (res.ok) {
      productsCache = await res.json();
      invalidateCategoriesCache();
      return productsCache;
    }
  } catch {
    /* offline fallback */
  }

  productsCache = [];
  invalidateCategoriesCache();
  return productsCache;
}

function saveProducts(products) {
  productsCache = products;
  localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(products));
  invalidateCategoriesCache();
}

async function persistProduct(product) {
  const synced = typeof syncProductImagesToStorage === 'function'
    ? await syncProductImagesToStorage(product)
    : product;

  const idx = productsCache.findIndex(p => p.id === synced.id);
  if (idx !== -1) {
    productsCache[idx] = synced;
  } else {
    productsCache.push(synced);
  }
  saveProducts(productsCache);

  if (typeof saveProductToDb === 'function') {
    const { error } = await saveProductToDb(synced);
    if (error) {
      showToast('Збережено локально. Помилка БД: ' + error);
      return synced;
    }
  }

  return synced;
}

async function removeProduct(productId) {
  productsCache = productsCache.filter(p => p.id !== productId);
  saveProducts(productsCache);

  if (typeof deleteProductFromDb === 'function') {
    await deleteProductFromDb(productId);
  }
}

function getProductById(id) {
  if (!productsCache) return null;
  return productsCache.find(p => p.id === Number(id)) || null;
}

function getNextProductId() {
  if (!productsCache || productsCache.length === 0) return 1;
  return Math.max(...productsCache.map(p => p.id)) + 1;
}

function exportProductsJson(products) {
  const blob = new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'products.json';
  a.click();
  URL.revokeObjectURL(url);
}

function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] px-6 py-3 rounded-xl bg-patriot-primary text-white text-sm font-medium shadow-2xl translate-y-20 opacity-0 transition-all duration-300 pointer-events-none';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = message || '';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  toast.style.opacity = '1';
  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(5rem)';
    toast.style.opacity = '0';
  }, 2500);
}
