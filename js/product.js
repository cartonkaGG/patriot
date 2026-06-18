/* Patriot Store — Product Page */

let productQty = 1;
let currentProduct = null;

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
    <a href="${getProductUrl(p.id)}" target="_blank" rel="noopener" class="product-card cursor-pointer block">
      <div class="product-image img-${p.category}">
        <svg class="product-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          ${getProductIcon(p.category)}
        </svg>
      </div>
      <div class="p-4">
        <h3 class="font-heading text-lg font-semibold">${p.name}</h3>
        <p class="text-patriot-accent font-semibold mt-1">${formatPrice(p.price)}</p>
      </div>
    </a>
  `).join('');
}

function renderProduct(product) {
  currentProduct = product;
  document.title = `${product.name} — Patriot Store`;

  document.getElementById('product-loading').classList.add('hidden');
  document.getElementById('product-content').classList.remove('hidden');

  const imageEl = document.getElementById('product-image');
  imageEl.className = `product-detail-image rounded-2xl overflow-hidden aspect-square img-${product.category} flex items-center justify-center`;
  imageEl.innerHTML = `
    <svg class="w-32 h-32 text-patriot-accent/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      ${getProductIcon(product.category)}
    </svg>
  `;

  const badgeEl = document.getElementById('product-badge');
  if (product.badge) {
    badgeEl.innerHTML = `<span class="product-badge ${product.badge} inline-block">${product.badge === 'hit' ? 'Хіт продажів' : 'Новинка'}</span>`;
  } else {
    badgeEl.innerHTML = '';
  }

  document.getElementById('product-category').textContent = CATEGORY_LABELS[product.category];
  document.getElementById('breadcrumb-category').textContent = CATEGORY_LABELS[product.category];
  document.getElementById('breadcrumb-category').href = `index.html#catalog`;
  document.getElementById('breadcrumb-name').textContent = product.name;
  document.getElementById('product-name').textContent = product.name;
  document.getElementById('product-price').textContent = formatPrice(product.price);
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
