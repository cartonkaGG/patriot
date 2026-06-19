/* Patriot Store — Product Page */

let productQty = 1;
let currentProduct = null;
let activeGalleryIndex = 0;
let currentGallery = [];

function setProductMainImage(src) {
  const imageEl = document.getElementById('product-image');
  if (src) {
    imageEl.className = 'product-detail-image rounded-2xl overflow-hidden aspect-square product-image--photo';
    imageEl.innerHTML = `<img src="${src}" alt="" class="product-photo product-photo--detail" loading="lazy">`;
  } else if (currentProduct) {
    imageEl.className = `product-detail-image rounded-2xl overflow-hidden aspect-square ${getCategoryImageClass(currentProduct.category)} flex items-center justify-center`;
    imageEl.innerHTML = `
      <svg class="w-32 h-32 text-patriot-accent/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        ${getProductIcon(currentProduct.category)}
      </svg>`;
  }
}

function updateGalleryControls() {
  const prevBtn = document.getElementById('gallery-prev');
  const nextBtn = document.getElementById('gallery-next');
  const counter = document.getElementById('gallery-counter');
  const hasMultiple = currentGallery.length > 1;

  prevBtn.classList.toggle('hidden', !hasMultiple);
  nextBtn.classList.toggle('hidden', !hasMultiple);
  counter.classList.toggle('hidden', !hasMultiple);

  if (hasMultiple) {
    counter.textContent = `${activeGalleryIndex + 1} / ${currentGallery.length}`;
  }
}

function setActiveGalleryIndex(index) {
  if (!currentGallery.length) return;

  activeGalleryIndex = (index + currentGallery.length) % currentGallery.length;
  setProductMainImage(currentGallery[activeGalleryIndex]);
  updateGalleryControls();

  const galleryEl = document.getElementById('product-gallery');
  galleryEl.querySelectorAll('.product-gallery-thumb').forEach((btn, i) => {
    btn.classList.toggle('active', i === activeGalleryIndex);
  });
}

function navigateGallery(delta) {
  if (currentGallery.length <= 1) return;
  setActiveGalleryIndex(activeGalleryIndex + delta);
}

function renderProductGallery(product) {
  currentGallery = getProductGallery(product);
  const galleryEl = document.getElementById('product-gallery');

  if (currentGallery.length <= 1) {
    galleryEl.classList.add('hidden');
    galleryEl.innerHTML = '';
    setProductMainImage(currentGallery[0] || null);
    updateGalleryControls();
    return;
  }

  activeGalleryIndex = 0;
  setProductMainImage(currentGallery[0]);
  galleryEl.classList.remove('hidden');
  galleryEl.innerHTML = currentGallery.map((src, index) => `
    <button type="button" class="product-gallery-thumb ${index === 0 ? 'active' : ''} cursor-pointer" data-index="${index}" aria-label="Фото ${index + 1}">
      <img src="${src}" alt="">
    </button>
  `).join('');

  galleryEl.querySelectorAll('.product-gallery-thumb').forEach(btn => {
    btn.addEventListener('click', () => {
      setActiveGalleryIndex(parseInt(btn.dataset.index, 10));
    });
  });

  updateGalleryControls();
}

function initGalleryNavigation() {
  document.getElementById('gallery-prev').addEventListener('click', () => navigateGallery(-1));
  document.getElementById('gallery-next').addEventListener('click', () => navigateGallery(1));

  document.addEventListener('keydown', (e) => {
    if (currentGallery.length <= 1) return;
    if (e.key === 'ArrowLeft') navigateGallery(-1);
    if (e.key === 'ArrowRight') navigateGallery(1);
  });
}

function renderRelatedProducts(product) {
  const container = document.getElementById('related-products');
  const related = productsCache
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  if (related.length === 0) {
    container.parentElement.classList.add('hidden');
    return;
  }

  container.innerHTML = related.map(p => `
    <a href="${getProductUrl(p.id)}" class="product-card cursor-pointer block">
      ${renderProductVisual(p, { imgClass: 'product-photo product-photo--card' })}
      <div class="p-4">
        <h3 class="font-heading text-lg font-semibold">${p.name}</h3>
        <div class="mt-1">${formatProductPriceHtml(p)}</div>
      </div>
    </a>
  `).join('');
}

function renderProduct(product) {
  currentProduct = product;
  document.title = `${product.name} — Patriot Store`;

  document.getElementById('product-loading').classList.add('hidden');
  document.getElementById('product-content').classList.remove('hidden');

  renderProductGallery(product);

  const badgeEl = document.getElementById('product-badge');
  const badges = [];
  if (product.badge) {
    badges.push(`<span class="product-badge ${product.badge} inline-block">${product.badge === 'hit' ? 'Хіт продажів' : 'Новинка'}</span>`);
  }
  if (hasSalePrice(product)) {
    badges.push('<span class="product-badge sale inline-block">Акція</span>');
  }
  badgeEl.innerHTML = badges.join(' ');

  document.getElementById('product-category').textContent = getCategoryLabel(product.category);
  document.getElementById('breadcrumb-category').textContent = getCategoryLabel(product.category);
  document.getElementById('breadcrumb-category').href = 'index.html#catalog';

  const codeEl = document.getElementById('product-code');
  if (codeEl) {
    if (hasProductCode(product)) {
      codeEl.textContent = `Код: ${product.code}`;
      codeEl.classList.remove('hidden');
    } else {
      codeEl.textContent = '';
      codeEl.classList.add('hidden');
    }
  }

  document.getElementById('breadcrumb-name').textContent = product.name;
  document.getElementById('product-name').textContent = product.name;
  document.getElementById('product-price').innerHTML = formatProductPriceHtml(product, 'text-3xl');

  const stockEl = document.getElementById('product-stock');
  if (stockEl) {
    stockEl.innerHTML = `<span class="stock-badge ${isProductInStock(product) ? 'stock-badge--in' : 'stock-badge--out'}">${formatStockLabel(product)}</span>`;
  }

  const addBtn = document.getElementById('add-to-cart-detail');
  if (addBtn) {
    const inStock = isProductInStock(product);
    addBtn.disabled = !inStock;
    addBtn.textContent = inStock ? 'Додати до кошика' : 'Немає в наявності';
    addBtn.classList.toggle('btn-disabled', !inStock);
  }

  document.getElementById('product-short-desc').textContent = product.description;
  document.getElementById('product-full-desc').textContent = product.fullDescription || product.description;

  const specsEl = document.getElementById('product-specs');
  const specs = product.specs || [];
  specsEl.innerHTML = specs.map(s => `<li>${s}</li>`).join('');

  renderRelatedProducts(product);
}

function initQtyControls() {
  document.getElementById('qty-decrease').addEventListener('click', () => {
    if (productQty > 1) {
      productQty--;
      document.getElementById('product-qty').textContent = productQty;
    }
  });

  document.getElementById('qty-increase').addEventListener('click', () => {
    productQty++;
    document.getElementById('product-qty').textContent = productQty;
  });

  document.getElementById('add-to-cart-detail').addEventListener('click', () => {
    if (currentProduct) {
      addToCart(currentProduct.id, productQty);
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  loadCart();
  await loadProducts();
  initCartListeners();
  initQtyControls();
  initGalleryNavigation();
  updateCartUI();

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    document.getElementById('product-loading').classList.add('hidden');
    document.getElementById('product-not-found').classList.remove('hidden');
    return;
  }

  const product = getProductById(id);
  if (!product) {
    document.getElementById('product-loading').classList.add('hidden');
    document.getElementById('product-not-found').classList.remove('hidden');
    return;
  }

  renderProduct(product);
});
