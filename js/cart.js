/* Patriot Store — Cart */

let cart = [];

function loadCart() {
  try {
    const stored = localStorage.getItem(STORAGE_CART_KEY);
    cart = stored ? JSON.parse(stored) : [];
  } catch {
    cart = [];
  }
  return cart;
}

function persistCart() {
  localStorage.setItem(STORAGE_CART_KEY, JSON.stringify(cart));
}

async function addToCart(productId, qty = 1) {
  const products = await loadProducts();
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id: product.id, name: product.name, category: product.category, price: product.price, qty });
  }

  persistCart();
  updateCartUI();
  showToast(`${product.name} додано до кошика`);
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  persistCart();
  updateCartUI();
}

function updateCartQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    removeFromCart(productId);
    return;
  }

  persistCart();
  updateCartUI();
}

function setCartQty(productId, qty) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;

  if (qty <= 0) {
    removeFromCart(productId);
    return;
  }

  item.qty = qty;
  persistCart();
  updateCartUI();
}

function getCartTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function getCartCount() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function updateCartUI() {
  const countEl = document.getElementById('cart-count');
  const itemsEl = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');

  if (!itemsEl) return;

  const totalItems = getCartCount();
  const totalPrice = getCartTotal();

  if (countEl) {
    if (totalItems > 0) {
      countEl.textContent = totalItems;
      countEl.classList.remove('hidden');
    } else {
      countEl.classList.add('hidden');
    }
  }

  if (totalEl) totalEl.textContent = formatPrice(totalPrice);

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
      <a href="${getProductUrl(item.id)}" target="_blank" class="cart-item-image img-${item.category} cursor-pointer flex-shrink-0">
        <svg class="w-6 h-6 text-patriot-accent/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          ${getProductIcon(item.category)}
        </svg>
      </a>
      <div class="flex-1 min-w-0">
        <a href="${getProductUrl(item.id)}" target="_blank" class="font-medium text-sm truncate block hover:text-patriot-accent transition-colors cursor-pointer">${item.name}</a>
        <p class="text-patriot-muted text-xs mt-0.5">${formatPrice(item.price)}</p>
        <div class="qty-controls mt-2">
          <button class="qty-btn cursor-pointer" data-action="decrease" data-id="${item.id}" aria-label="Зменшити кількість">−</button>
          <span class="qty-value">${item.qty}</span>
          <button class="qty-btn cursor-pointer" data-action="increase" data-id="${item.id}" aria-label="Збільшити кількість">+</button>
        </div>
      </div>
      <div class="flex flex-col items-end justify-between">
        <span class="font-semibold text-sm whitespace-nowrap">${formatPrice(item.price * item.qty)}</span>
        <button class="text-stone-400 hover:text-red-500 transition-colors cursor-pointer remove-cart-btn mt-2" data-id="${item.id}" aria-label="Видалити ${item.name}">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

function openCart() {
  document.body.classList.add('cart-open');
  const overlay = document.getElementById('cart-overlay');
  if (overlay) overlay.setAttribute('aria-hidden', 'false');
}

function closeCart() {
  document.body.classList.remove('cart-open');
  const overlay = document.getElementById('cart-overlay');
  if (overlay) overlay.setAttribute('aria-hidden', 'true');
}

function clearCart() {
  cart = [];
  persistCart();
  updateCartUI();
}

function initCartListeners() {
  const cartBtn = document.getElementById('cart-btn');
  const cartClose = document.getElementById('cart-close');
  const cartOverlay = document.getElementById('cart-overlay');

  if (cartBtn) cartBtn.addEventListener('click', openCart);
  if (cartClose) cartClose.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('.add-to-cart-btn');
    if (addBtn) {
      e.preventDefault();
      e.stopPropagation();
      const qty = parseInt(addBtn.dataset.qty || '1', 10);
      addToCart(parseInt(addBtn.dataset.id, 10), qty);
      return;
    }

    const removeBtn = e.target.closest('.remove-cart-btn');
    if (removeBtn) {
      removeFromCart(parseInt(removeBtn.dataset.id, 10));
      return;
    }

    const qtyBtn = e.target.closest('.qty-btn');
    if (qtyBtn) {
      const id = parseInt(qtyBtn.dataset.id, 10);
      const delta = qtyBtn.dataset.action === 'increase' ? 1 : -1;
      updateCartQty(id, delta);
    }
  });
}
