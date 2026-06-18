/* Patriot Store — Main JavaScript */

const PRODUCTS = [
  {
    id: 1,
    name: 'Umarex Glock 17 Gen 5',
    category: 'pneumatic',
    price: 4890,
    badge: 'hit',
    description: 'Пневматичний пістолет, 4.5 мм, blowback'
  },
  {
    id: 2,
    name: 'Beretta M92A1 Full Auto',
    category: 'pneumatic',
    price: 6750,
    badge: 'new',
    description: 'CO₂ пістолет з системою blowback'
  },
  {
    id: 3,
    name: 'Kalashnikov AK-47 CO₂',
    category: 'pneumatic',
    price: 9200,
    badge: null,
    description: 'Пневматична гвинтівка, 4.5 мм'
  },
  {
    id: 4,
    name: 'Статуетка «Воїн ЗСУ»',
    category: 'statues',
    price: 1890,
    badge: 'hit',
    description: 'Бронза, висота 25 см, обмежена серія'
  },
  {
    id: 5,
    name: 'Статуетка «Снайпер»',
    category: 'statues',
    price: 2450,
    badge: null,
    description: 'Полірезин, деталізована фігурка'
  },
  {
    id: 6,
    name: 'Статуетка «Орел Патріот»',
    category: 'statues',
    price: 3200,
    badge: 'new',
    description: 'Метал + дерево, ручна робота'
  },
  {
    id: 7,
    name: 'Zippo Classic Brushed Chrome',
    category: 'zippo',
    price: 1650,
    badge: null,
    description: 'Оригінальна запальничка, матовий хром'
  },
  {
    id: 8,
    name: 'Zippo «Wings» Limited',
    category: 'zippo',
    price: 2890,
    badge: 'hit',
    description: 'Лімітована серія з гравіюванням'
  },
  {
    id: 9,
    name: 'Zippo Armor Deep Carve',
    category: 'zippo',
    price: 3450,
    badge: 'new',
    description: 'Товстостінний корпус, 3D-гравіювання'
  },
  {
    id: 10,
    name: 'Sabre Red Pepper Gel',
    category: 'defense',
    price: 590,
    badge: null,
    description: 'Гелевий перцевий балончик, 57 г'
  },
  {
    id: 11,
    name: 'Балончик «Страж» 25 мл',
    category: 'defense',
    price: 320,
    badge: 'hit',
    description: 'Компактний, на брелок'
  },
  {
    id: 12,
    name: 'Тактичний балончик PRO',
    category: 'defense',
    price: 780,
    badge: null,
    description: 'Потужна формула OC, 90 мл'
  },
  {
    id: 13,
    name: 'Cold Steel Recon 1',
    category: 'accessories',
    price: 4200,
    badge: null,
    description: 'Складний ніж, сталь AUS-10'
  },
  {
    id: 14,
    name: 'Тактичний ліхтар Fenix TK16',
    category: 'accessories',
    price: 2890,
    badge: 'new',
    description: '3100 люмен, IP68'
  },
  {
    id: 15,
    name: 'Рукавички Mechanix M-Pact',
    category: 'accessories',
    price: 1450,
    badge: null,
    description: 'Тактичні рукавички з захистом'
  },
  {
    id: 16,
    name: 'Чохол для пневматики',
    category: 'accessories',
    price: 890,
    badge: null,
    description: 'М\'який чохол, універсальний розмір'
  }
];

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

let cart = [];
let currentFilter = 'all';

function formatPrice(price) {
  return price.toLocaleString('uk-UA') + ' ₴';
}

function getProductIcon(category) {
  return CATEGORY_ICONS[category] || CATEGORY_ICONS.accessories;
}

function createProductCard(product) {
  const badgeHtml = product.badge
    ? `<span class="product-badge ${product.badge}">${product.badge === 'hit' ? 'Хіт' : 'Новинка'}</span>`
    : '';

  return `
    <article class="product-card fade-in" data-id="${product.id}" data-category="${product.category}">
      <div class="product-image img-${product.category}">
        ${badgeHtml}
        <svg class="product-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          ${getProductIcon(product.category)}
        </svg>
      </div>
      <div class="p-5">
        <span class="text-[10px] uppercase tracking-wider text-patriot-accent font-semibold">${CATEGORY_LABELS[product.category]}</span>
        <h3 class="font-heading text-lg font-semibold mt-1 mb-1 leading-tight">${product.name}</h3>
        <p class="text-patriot-muted text-xs mb-4 line-clamp-2">${product.description}</p>
        <div class="flex items-center justify-between gap-3">
          <span class="font-semibold text-lg">${formatPrice(product.price)}</span>
          <button class="add-to-cart-btn cursor-pointer" data-id="${product.id}" aria-label="Додати ${product.name} до кошика">
            У кошик
          </button>
        </div>
      </div>
    </article>
  `;
}

function createShowcaseCard(product) {
  return `
    <div class="showcase-card" data-id="${product.id}">
      <div class="showcase-image img-${product.category}">
        <svg class="product-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          ${getProductIcon(product.category)}
        </svg>
      </div>
      <div class="p-5">
        <span class="text-[10px] uppercase tracking-wider text-patriot-accent font-semibold">${CATEGORY_LABELS[product.category]}</span>
        <h3 class="font-heading text-xl text-white font-semibold mt-1 mb-2">${product.name}</h3>
        <div class="flex items-center justify-between">
          <span class="text-white font-semibold">${formatPrice(product.price)}</span>
          <button class="text-patriot-accent text-sm font-medium hover:text-patriot-accent-light transition-colors cursor-pointer add-to-cart-btn" data-id="${product.id}">
            + Кошик
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderProducts(filter = 'all') {
  const grid = document.getElementById('product-grid');
  const filtered = filter === 'all'
    ? PRODUCTS
    : PRODUCTS.filter(p => p.category === filter);

  grid.innerHTML = filtered.map(createProductCard).join('');
  currentFilter = filter;
}

function renderShowcase() {
  const track = document.getElementById('showcase-track');
  const featured = PRODUCTS.filter(p => p.badge === 'hit' || p.badge === 'new');
  track.innerHTML = featured.map(createShowcaseCard).join('');
}

function addToCart(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  updateCartUI();
  showToast(`${product.name} додано до кошика`);
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  updateCartUI();
}

function updateCartUI() {
  const countEl = document.getElementById('cart-count');
  const itemsEl = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  if (totalItems > 0) {
    countEl.textContent = totalItems;
    countEl.classList.remove('hidden');
  } else {
    countEl.classList.add('hidden');
  }

  totalEl.textContent = formatPrice(totalPrice);

  if (cart.length === 0) {
    itemsEl.innerHTML = `
      <div class="cart-empty">
        <svg class="w-12 h-12 mx-auto mb-4 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
        </svg>
        <p class="font-medium">Кошик порожній</p>
        <p class="text-sm mt-1">Додайте товари з каталогу</p>
      </div>
    `;
    return;
  }

  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-image img-${item.category}">
        <svg class="w-6 h-6 text-patriot-accent/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          ${getProductIcon(item.category)}
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <h4 class="font-medium text-sm truncate">${item.name}</h4>
        <p class="text-patriot-muted text-xs mt-0.5">${item.qty} × ${formatPrice(item.price)}</p>
      </div>
      <button class="text-stone-400 hover:text-red-500 transition-colors cursor-pointer remove-cart-btn" data-id="${item.id}" aria-label="Видалити ${item.name}">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
      </button>
    </div>
  `).join('');
}

function setFilter(filter) {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    const isActive = btn.dataset.filter === filter;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive);
  });
  renderProducts(filter);
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.transform = 'translateX(-50%) translateY(0)';
  toast.style.opacity = '1';

  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(5rem)';
    toast.style.opacity = '0';
  }, 2500);
}

function openCart() {
  document.body.classList.add('cart-open');
  document.getElementById('cart-overlay').setAttribute('aria-hidden', 'false');
}

function closeCart() {
  document.body.classList.remove('cart-open');
  document.getElementById('cart-overlay').setAttribute('aria-hidden', 'true');
}

function openSearch() {
  document.body.classList.add('search-open');
  document.getElementById('search-input').focus();
}

function closeSearch() {
  document.body.classList.remove('search-open');
  document.getElementById('search-results').innerHTML = '';
  document.getElementById('search-input').value = '';
}

function handleSearch(query) {
  const resultsEl = document.getElementById('search-results');
  if (!query.trim()) {
    resultsEl.innerHTML = '';
    return;
  }

  const q = query.toLowerCase();
  const results = PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q) ||
    CATEGORY_LABELS[p.category].toLowerCase().includes(q)
  );

  if (results.length === 0) {
    resultsEl.innerHTML = '<p class="text-white/60 text-center py-4">Нічого не знайдено</p>';
    return;
  }

  resultsEl.innerHTML = results.map(p => `
    <div class="search-result-item" data-id="${p.id}">
      <div class="w-10 h-10 rounded-lg img-${p.category} flex items-center justify-center flex-shrink-0">
        <svg class="w-5 h-5 text-patriot-accent/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          ${getProductIcon(p.category)}
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-medium text-sm truncate">${p.name}</p>
        <p class="text-patriot-muted text-xs">${formatPrice(p.price)}</p>
      </div>
    </div>
  `).join('');
}

function initAgeGate() {
  if (sessionStorage.getItem('patriot-age-verified')) {
    document.body.classList.add('age-verified');
    return;
  }

  document.getElementById('age-confirm').addEventListener('click', () => {
    sessionStorage.setItem('patriot-age-verified', 'true');
    document.body.classList.add('age-verified');
  });

  document.getElementById('age-deny').addEventListener('click', () => {
    window.location.href = 'https://www.google.com';
  });
}

function initHorizontalScroll() {
  const container = document.querySelector('.horizontal-scroll-container');
  const progress = document.getElementById('scroll-progress');
  if (!container || !progress) return;

  container.addEventListener('scroll', () => {
    const maxScroll = container.scrollWidth - container.clientWidth;
    const percent = maxScroll > 0 ? (container.scrollLeft / maxScroll) * 100 : 0;
    progress.style.width = percent + '%';
  });
}

function initEventListeners() {
  document.getElementById('cart-btn').addEventListener('click', openCart);
  document.getElementById('cart-close').addEventListener('click', closeCart);
  document.getElementById('cart-overlay').addEventListener('click', closeCart);

  document.getElementById('search-btn').addEventListener('click', openSearch);
  document.getElementById('search-close').addEventListener('click', closeSearch);
  document.getElementById('search-input').addEventListener('input', (e) => {
    handleSearch(e.target.value);
  });

  document.getElementById('menu-btn').addEventListener('click', () => {
    const menu = document.getElementById('mobile-menu');
    const btn = document.getElementById('menu-btn');
    const isOpen = menu.classList.toggle('hidden');
    btn.setAttribute('aria-expanded', !isOpen);
  });

  document.getElementById('filter-buttons').addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (btn) setFilter(btn.dataset.filter);
  });

  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('.add-to-cart-btn');
    if (addBtn) {
      e.stopPropagation();
      addToCart(parseInt(addBtn.dataset.id, 10));
      return;
    }

    const removeBtn = e.target.closest('.remove-cart-btn');
    if (removeBtn) {
      removeFromCart(parseInt(removeBtn.dataset.id, 10));
      return;
    }

    const searchResult = e.target.closest('.search-result-item');
    if (searchResult) {
      closeSearch();
      setFilter('all');
      document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
      return;
    }

    const categoryLink = e.target.closest('[data-filter]');
    if (categoryLink && categoryLink.tagName === 'A' && categoryLink.dataset.filter) {
      e.preventDefault();
      setFilter(categoryLink.dataset.filter);
      document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
    }
  });

  document.getElementById('newsletter-form').addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('Дякуємо за підписку!');
    e.target.reset();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCart();
      closeSearch();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initAgeGate();
  renderProducts();
  renderShowcase();
  updateCartUI();
  initHorizontalScroll();
  initEventListeners();
});
