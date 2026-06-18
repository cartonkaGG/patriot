/* Patriot Store — Main Page */

let currentFilter = 'all';

function createProductCard(product) {
  const inStock = isProductInStock(product);
  return `
    <article class="product-card fade-in" data-id="${product.id}" data-category="${product.category}">
      <a href="${getProductUrl(product.id)}" class="block product-link cursor-pointer">
        ${renderProductVisual(product)}
      </a>
      <div class="p-5">
        <span class="text-[10px] uppercase tracking-wider text-patriot-accent font-semibold">${CATEGORY_LABELS[product.category]}</span>
        <a href="${getProductUrl(product.id)}" class="block cursor-pointer">
          <h3 class="font-heading text-lg font-semibold mt-1 mb-1 leading-tight hover:text-patriot-accent transition-colors duration-200">${product.name}</h3>
        </a>
        <p class="text-patriot-muted text-xs mb-2 line-clamp-2">${product.description}</p>
        <p class="text-xs mb-3"><span class="stock-badge ${inStock ? 'stock-badge--in' : 'stock-badge--out'}">${formatStockLabel(product)}</span></p>
        <div class="flex items-center justify-between gap-3">
          <div class="product-price-inline">${formatProductPriceHtml(product)}</div>
          <button class="add-to-cart-btn cursor-pointer${inStock ? '' : ' add-to-cart-btn--disabled'}" data-id="${product.id}" ${inStock ? '' : 'disabled'} aria-label="Додати ${product.name} до кошика">
            ${inStock ? 'У кошик' : 'Немає'}
          </button>
        </div>
      </div>
    </article>
  `;
}

function createShowcaseCard(product) {
  const inStock = isProductInStock(product);
  return `
    <div class="showcase-card" data-id="${product.id}">
      <a href="${getProductUrl(product.id)}" class="block cursor-pointer">
        ${renderProductVisual(product, { className: 'showcase-image', iconClass: 'product-icon' })}
      </a>
      <div class="p-5">
        <span class="text-[10px] uppercase tracking-wider text-patriot-accent font-semibold">${CATEGORY_LABELS[product.category]}</span>
        <a href="${getProductUrl(product.id)}" class="block cursor-pointer">
          <h3 class="font-heading text-xl text-white font-semibold mt-1 mb-2 hover:text-patriot-accent transition-colors duration-200">${product.name}</h3>
        </a>
        <div class="flex items-center justify-between">
          <div class="product-price-inline product-price-inline--light">${formatProductPriceHtml(product)}</div>
          <button class="text-patriot-accent text-sm font-medium hover:text-patriot-accent-light transition-colors cursor-pointer add-to-cart-btn${inStock ? '' : ' add-to-cart-btn--disabled'}" data-id="${product.id}" ${inStock ? '' : 'disabled'}>
            ${inStock ? '+ Кошик' : 'Немає'}
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderProducts(filter = 'all') {
  const grid = document.getElementById('product-grid');
  if (!grid || !productsCache) return;

  const filtered = filter === 'all'
    ? productsCache
    : productsCache.filter(p => p.category === filter);

  grid.innerHTML = filtered.map(createProductCard).join('');
  currentFilter = filter;
}

function renderShowcase() {
  const track = document.getElementById('showcase-track');
  if (!track || !productsCache) return;

  const featured = productsCache.filter(p => p.badge === 'hit' || p.badge === 'new');
  track.innerHTML = featured.map(createShowcaseCard).join('');
}

function setFilter(filter) {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    const isActive = btn.dataset.filter === filter;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive);
  });
  renderProducts(filter);
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
  const results = productsCache.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q) ||
    (p.fullDescription && p.fullDescription.toLowerCase().includes(q)) ||
    CATEGORY_LABELS[p.category].toLowerCase().includes(q)
  );

  if (results.length === 0) {
    resultsEl.innerHTML = '<p class="text-white/60 text-center py-4">Нічого не знайдено</p>';
    return;
  }

  resultsEl.innerHTML = results.map(p => `
    <a href="${getProductUrl(p.id)}" class="search-result-item cursor-pointer">
      <div class="w-10 h-10 rounded-lg img-${p.category} flex items-center justify-center flex-shrink-0">
        <svg class="w-5 h-5 text-patriot-accent/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          ${getProductIcon(p.category)}
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-medium text-sm truncate">${p.name}</p>
        <p class="text-patriot-muted text-xs">${formatProductPriceHtml(p)}</p>
      </div>
    </a>
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
    const categoryLink = e.target.closest('[data-filter]');
    if (categoryLink && categoryLink.tagName === 'A' && categoryLink.dataset.filter && !categoryLink.classList.contains('filter-btn')) {
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

document.addEventListener('DOMContentLoaded', async () => {
  initAgeGate();
  loadCart();
  await loadProducts();
  renderProducts();
  renderShowcase();
  updateCartUI();
  initHorizontalScroll();
  initCartListeners();
  initEventListeners();
});
