/* Patriot Store — Data Layer */

const STORAGE_PRODUCTS_KEY = 'patriot-products';
const STORAGE_CART_KEY = 'patriot-cart';
const STORAGE_ORDERS_KEY = 'patriot-orders';
const STORAGE_SETTINGS_KEY = 'patriot-settings';

const PICKUP_ADDRESS = 'м. Луцьк, проспект Волі, 1, ЦУМ 5 поверх';

const CATEGORY_LABELS = {
  pneumatic: 'Пневматика',
  statues: 'Статуетки',
  zippo: 'Zippo',
  defense: 'Самооборона',
  accessories: 'Аксесуари'
};

const CATEGORY_ICONS = {
  pneumatic: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>',
  statues: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>',
  zippo: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/>',
  defense: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>',
  accessories: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"/>'
};

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

function getProductIcon(category) {
  return CATEGORY_ICONS[category] || CATEGORY_ICONS.accessories;
}

function getProductUrl(id) {
  return `product.html?id=${id}`;
}

async function loadProducts() {
  if (productsCache) return productsCache;

  const stored = localStorage.getItem(STORAGE_PRODUCTS_KEY);
  if (stored) {
    try {
      productsCache = JSON.parse(stored);
      return productsCache;
    } catch {
      localStorage.removeItem(STORAGE_PRODUCTS_KEY);
    }
  }

  try {
    const res = await fetch('data/products.json');
    if (res.ok) {
      productsCache = await res.json();
      return productsCache;
    }
  } catch {
    /* offline fallback */
  }

  productsCache = [];
  return productsCache;
}

function saveProducts(products) {
  productsCache = products;
  localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(products));
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
