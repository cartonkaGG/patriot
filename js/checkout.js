/* Patriot Store — Checkout */

let selectedNpCity = null;

const DELIVERY_LABELS = {
  nova_poshta: 'Нова Пошта',
  pickup: 'Самовивіз'
};

const PAYMENT_LABELS = {
  online: 'Оплатити зараз',
  on_delivery: 'Оплата при отриманні'
};

function renderOrderSummary() {
  const container = document.getElementById('checkout-items');
  const totalEl = document.getElementById('checkout-total');

  if (cart.length === 0) {
    container.innerHTML = '<p class="text-patriot-muted text-sm">Кошик порожній</p>';
    totalEl.textContent = '0 ₴';
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="checkout-item">
      ${renderCartItemThumb(item, 'checkout-item-image')}
      <div class="flex-1 min-w-0">
        <p class="font-medium text-sm truncate">${item.name}</p>
        <p class="text-patriot-muted text-xs">${item.qty} × ${formatPrice(item.price)}</p>
      </div>
      <span class="font-semibold text-sm whitespace-nowrap">${formatPrice(item.price * item.qty)}</span>
    </div>
  `).join('');

  totalEl.textContent = formatPrice(getCartTotal());
}

function toggleDeliveryFields(method) {
  const isNp = method === 'nova_poshta';
  const isPickup = method === 'pickup';

  document.getElementById('delivery-np').classList.toggle('hidden', !isNp);
  document.getElementById('delivery-pickup').classList.toggle('hidden', !isPickup);

  const cityInput = document.getElementById('np-city');
  const warehouseSelect = document.getElementById('np-warehouse');

  cityInput.required = isNp;
  warehouseSelect.required = isNp;
  cityInput.disabled = !isNp;
  if (!isNp) {
    warehouseSelect.disabled = true;
  } else if (selectedNpCity || warehouseSelect.options.length > 1) {
    warehouseSelect.disabled = warehouseSelect.options.length <= 1;
  }
}

function validateDelivery(method) {
  if (method === 'nova_poshta') {
    if (!document.getElementById('np-city').value.trim()) return 'Вкажіть місто';
    if (!document.getElementById('np-warehouse').value) return 'Оберіть відділення Нової Пошти';
  }
  return null;
}

function initNovaPoshta() {
  const cityInput = document.getElementById('np-city');
  const cityList = document.getElementById('np-city-list');
  const warehouseSelect = document.getElementById('np-warehouse');
  const npHint = document.getElementById('np-api-hint');
  const settings = loadSettings();

  if (!settings.npApiKey) {
    npHint.classList.remove('hidden');
  } else {
    npHint.classList.add('hidden');
  }

  const searchCities = debounce(async (query) => {
    selectedNpCity = null;
    warehouseSelect.innerHTML = '<option value="">Спочатку оберіть місто</option>';
    warehouseSelect.disabled = true;

    if (query.length < 2) {
      cityList.classList.add('hidden');
      return;
    }

    try {
      const cities = await npSearchCities(query, settings.npApiKey);
      renderAutocomplete(cityList, cities, async (city) => {
        selectedNpCity = city;
        cityInput.value = city.name;
        cityList.classList.add('hidden');
        warehouseSelect.innerHTML = '<option value="">Завантаження відділень...</option>';
        warehouseSelect.disabled = true;

        try {
          const warehouses = await npGetWarehouses(city.ref, settings.npApiKey);
          warehouseSelect.innerHTML = '<option value="">Оберіть відділення</option>' +
            warehouses.map(w => {
              const label = `№${w.number} — ${w.short}`;
              return `<option value="${w.ref}" data-label="${escapeHtml(w.description || label)}">${escapeHtml(label)}</option>`;
            }).join('');
          warehouseSelect.disabled = false;
        } catch (err) {
          warehouseSelect.innerHTML = `<option value="">${err.message}</option>`;
        }
      });
    } catch {
      cityList.innerHTML = '<div class="autocomplete-empty">Перевірте API-ключ Нової Пошти в адмін-панелі</div>';
      cityList.classList.remove('hidden');
    }
  }, 400);

  cityInput.addEventListener('input', (e) => searchCities(e.target.value.trim()));
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#np-city-wrap')) cityList.classList.add('hidden');
  });
}

function getDeliveryInfo(method) {
  if (method === 'pickup') {
    return { type: 'pickup', address: PICKUP_ADDRESS };
  }
  if (method === 'nova_poshta') {
    const warehouse = document.getElementById('np-warehouse');
    const opt = warehouse.options[warehouse.selectedIndex];
    return {
      type: 'nova_poshta',
      city: document.getElementById('np-city').value,
      warehouseRef: warehouse.value,
      warehouseLabel: opt?.dataset?.label || opt?.textContent || ''
    };
  }
  return {};
}

async function prefillCustomerForm() {
  const user = await getCurrentUser();
  if (!user) return;

  const profile = await getUserProfile();
  if (profile?.full_name) document.getElementById('customer-name').value = profile.full_name;
  if (profile?.phone) document.getElementById('customer-phone').value = profile.phone;
  if (user.email) document.getElementById('customer-email').value = user.email;
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();

  if (cart.length === 0) {
    showToast('Кошик порожній');
    return;
  }

  const submitBtn = document.querySelector('#checkout-form button[type="submit"]');
  const method = document.querySelector('input[name="delivery"]:checked')?.value;
  const payment = document.querySelector('input[name="payment"]:checked')?.value;

  const deliveryError = validateDelivery(method);
  if (deliveryError) {
    showToast(deliveryError);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Обробка...';

  try {
    const order = {
      id: getNextOrderId(),
      date: new Date().toISOString(),
      customer: {
        name: document.getElementById('customer-name').value.trim(),
        phone: document.getElementById('customer-phone').value.trim(),
        email: document.getElementById('customer-email').value.trim()
      },
      delivery: getDeliveryInfo(method),
      payment: payment,
      comment: document.getElementById('order-comment').value.trim(),
      items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, image: i.image || null, category: i.category })),
      total: getCartTotal(),
      status: payment === 'online' ? 'awaiting_payment' : 'new'
    };

    saveOrder(order);

    const dbResult = await saveOrderToDatabase(order);
    if (dbResult.error) {
      console.warn('DB save:', dbResult.error);
    } else if (dbResult.dbId) {
      linkOrderToDatabase(order.id, dbResult.dbId);
    }

    clearCart();

    document.getElementById('checkout-form-wrap').classList.add('hidden');
    document.getElementById('checkout-success').classList.remove('hidden');
    document.getElementById('order-number').textContent = `#${dbResult.dbId || order.id}`;
    document.getElementById('order-summary-text').innerHTML = `
      <p><strong>Доставка:</strong> ${DELIVERY_LABELS[method] || '—'}</p>
      <p><strong>Оплата:</strong> ${PAYMENT_LABELS[payment] || '—'}</p>
      ${payment === 'online' ? '<p class="text-patriot-accent mt-2">Менеджер зв\'яжеться з вами для оплати.</p>' : ''}
          ${isSupabaseConfigured() ? '<p class="mt-3"><a href="cabinet.html" class="text-patriot-accent underline cursor-pointer">Переглянути в особистому кабінеті</a></p>' : ''}
    `;
  } catch (err) {
    showToast(err.message || 'Помилка оформлення замовлення');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Підтвердити замовлення';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  loadCart();
  await loadProducts();
  syncCartWithProducts();
  updateCartUI();

  if (cart.length === 0) {
    document.getElementById('checkout-empty').classList.remove('hidden');
    document.getElementById('checkout-form-wrap').classList.add('hidden');
    return;
  }

  renderOrderSummary();
  initNovaPoshta();

  try {
    await prefillCustomerForm();
  } catch (err) {
    console.warn('Prefill customer:', err);
  }

  document.querySelectorAll('input[name="delivery"]').forEach(radio => {
    radio.addEventListener('change', (e) => toggleDeliveryFields(e.target.value));
  });

  toggleDeliveryFields(document.querySelector('input[name="delivery"]:checked').value);
  document.getElementById('checkout-form').addEventListener('submit', handleCheckoutSubmit);
});
