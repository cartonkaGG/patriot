/* Patriot Store — Delivery APIs */

function safeStr(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function escapeHtml(text) {
  return safeStr(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function npRequest(apiKey, modelName, calledMethod, methodProperties) {
  const res = await fetch('https://api.novaposhta.ua/v2.0/json/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, modelName, calledMethod, methodProperties })
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.errors?.[0] || 'Помилка Нової Пошти');
  }
  return data.data;
}

function normalizeNpSettlements(data) {
  const settlements = [];

  if (!Array.isArray(data)) return settlements;

  data.forEach(block => {
    if (block?.Addresses && Array.isArray(block.Addresses)) {
      settlements.push(...block.Addresses);
    } else if (block) {
      settlements.push(block);
    }
  });

  return settlements.map(item => ({
    ref: item.DeliveryCity || item.Ref || item.SettlementRef,
    name: safeStr(
      item.Present || item.MainDescription || item.Description ||
      [item.SettlementTypeDescription, item.Settlement].filter(Boolean).join(' ')
    ),
    area: safeStr(item.AreaDescription || item.RegionDescription || item.Region)
  })).filter(item => item.ref && item.name);
}

async function npSearchCities(query, apiKey) {
  if (!apiKey || query.length < 2) return [];

  try {
    const data = await npRequest(apiKey, 'Address', 'searchSettlements', {
      CityName: query,
      Limit: 20,
      Page: 1
    });
    const results = normalizeNpSettlements(data);
    if (results.length) return results;
  } catch {
    /* fallback below */
  }

  try {
    const data = await npRequest(apiKey, 'Address', 'getCities', {
      FindByString: query,
      Limit: 20
    });
    return (Array.isArray(data) ? data : []).map(item => ({
      ref: item.DeliveryCity || item.Ref,
      name: safeStr(item.Description || item.Present),
      area: safeStr(item.AreaDescription || item.Area)
    })).filter(item => item.ref && item.name);
  } catch {
    return [];
  }
}

async function npGetWarehouses(cityRef, apiKey) {
  if (!apiKey || !cityRef) return [];
  const data = await npRequest(apiKey, 'Address', 'getWarehouses', {
    CityRef: cityRef,
    Limit: 500
  });
  return (Array.isArray(data) ? data : []).map(w => ({
    ref: w.Ref,
    number: safeStr(w.Number, '—'),
    description: safeStr(w.Description),
    short: safeStr(w.ShortAddress || w.Description, 'Відділення')
  })).filter(w => w.ref);
}

async function ukrSearchCities(query) {
  if (query.length < 2) return [];
  try {
    const res = await fetch(`https://www.ukrposhta.ua/api/get-city-by-name?cityUa=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    const entries = data?.Entries?.Entry;
    if (!entries) return [];
    const list = Array.isArray(entries) ? entries : [entries];
    return list.slice(0, 20).map(c => ({
      id: c.CITY_ID,
      name: c.CITY_UA,
      region: c.REGION_UA || '',
      district: c.DISTRICT_UA || ''
    }));
  } catch {
    return [];
  }
}

async function ukrGetOffices(cityId) {
  if (!cityId) return [];
  try {
    const res = await fetch(`https://www.ukrposhta.ua/api/get-post-offices-by-city-id?cityId=${encodeURIComponent(cityId)}`);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    const entries = data?.Entries?.Entry;
    if (!entries) return [];
    const list = Array.isArray(entries) ? entries : [entries];
    return list.map(o => ({
      id: o.POSTOFFICE_ID || o.POSTINDEX,
      index: o.POSTINDEX,
      address: o.POSTOFFICE_UA || o.ADDRESS_UA || o.STREET_UA,
      name: `№${o.POSTINDEX} — ${o.POSTOFFICE_UA || o.ADDRESS_UA || ''}`
    }));
  } catch {
    return [];
  }
}

async function ukrGetOfficesByIndex(postIndex) {
  if (!postIndex || postIndex.length < 5) return [];
  try {
    const res = await fetch(`https://www.ukrposhta.ua/api/get-post-offices-by-postindex?postIndex=${encodeURIComponent(postIndex)}`);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    const entries = data?.Entries?.Entry;
    if (!entries) return [];
    const list = Array.isArray(entries) ? entries : [entries];
    return list.map(o => ({
      id: o.POSTOFFICE_ID || o.POSTINDEX,
      index: o.POSTINDEX,
      address: o.POSTOFFICE_UA || o.ADDRESS_UA,
      name: `№${o.POSTINDEX} — ${o.POSTOFFICE_UA || o.ADDRESS_UA || ''}`
    }));
  } catch {
    return [];
  }
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function renderAutocomplete(container, items, onSelect) {
  if (!items.length) {
    container.innerHTML = '<div class="autocomplete-empty">Нічого не знайдено</div>';
    container.classList.remove('hidden');
    return;
  }
  container.innerHTML = items.map((item, i) => `
    <button type="button" class="autocomplete-item cursor-pointer" data-index="${i}">
      <span class="font-medium">${escapeHtml(item.name || 'Без назви')}</span>
      ${item.area || item.region ? `<span class="text-patriot-muted text-xs">${escapeHtml(item.area || [item.region, item.district].filter(Boolean).join(', '))}</span>` : ''}
    </button>
  `).join('');
  container.classList.remove('hidden');
  container.querySelectorAll('.autocomplete-item').forEach(btn => {
    btn.addEventListener('click', () => {
      onSelect(items[parseInt(btn.dataset.index, 10)]);
      container.classList.add('hidden');
    });
  });
}
