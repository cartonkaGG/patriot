/* Patriot Store — Supabase Client */

let supabaseClient = null;

function isSupabaseConfigured() {
  const { supabaseUrl, supabaseAnonKey } = loadSettings();
  return Boolean(supabaseUrl && supabaseAnonKey);
}

function getSupabase() {
  if (!window.supabase) {
    return null;
  }

  const { supabaseUrl, supabaseAnonKey } = loadSettings();
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    });
  }
  return supabaseClient;
}

function getSupabaseAdmin() {
  const { supabaseUrl, supabaseServiceKey } = loadSettings();
  if (!supabaseUrl || !supabaseServiceKey || !window.supabase) return null;
  return window.supabase.createClient(supabaseUrl, supabaseServiceKey);
}

async function saveOrderToDatabase(order) {
  const client = getSupabase();
  if (!client) return { error: null, dbId: null };

  const user = await getCurrentUser();
  const payload = {
    user_id: user?.id || null,
    customer_name: order.customer.name,
    customer_phone: order.customer.phone,
    customer_email: order.customer.email || null,
    delivery: order.delivery,
    payment: order.payment,
    comment: order.comment || null,
    items: order.items,
    total: order.total,
    status: order.status
  };

  const { data, error } = await client.from('orders').insert(payload).select('id').single();
  if (error) return { error: error.message, dbId: null };
  return { error: null, dbId: data.id };
}

async function fetchUserOrders() {
  const client = getSupabase();
  const user = await getCurrentUser();
  if (!user) return [];

  let dbOrders = [];

  if (client) {
    const { data, error } = await client
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      dbOrders = data;
    } else if (error) {
      console.warn('Supabase orders:', error.message);
    }
  }

  const localOrders = getLocalOrdersForUser(user);
  return mergeOrders(dbOrders, localOrders);
}

function getLocalOrdersForUser(user) {
  const email = user.email?.toLowerCase().trim();
  let phone = '';
  try {
    phone = normalizeUaPhone(user.user_metadata?.phone || user.phone || '');
  } catch {
    phone = '';
  }

  return loadOrders()
    .filter(o => {
      const orderEmail = o.customer?.email?.toLowerCase().trim();
      let orderPhone = '';
      try {
        orderPhone = o.customer?.phone ? normalizeUaPhone(o.customer.phone) : '';
      } catch {
        orderPhone = '';
      }
      return (email && orderEmail === email) || (phone && orderPhone === phone);
    })
    .map(o => ({
      id: o.dbId || o.id,
      created_at: o.date,
      delivery: o.delivery,
      payment: o.payment,
      items: o.items,
      total: o.total,
      status: o.status || 'new',
      dbId: o.dbId || null,
      localId: o.id
    }));
}

function mergeOrders(dbOrders, localOrders) {
  const dbIds = new Set(dbOrders.map(o => String(o.id)));
  const merged = [...dbOrders];

  localOrders.forEach(local => {
    if (local.dbId && dbIds.has(String(local.dbId))) return;
    if (dbIds.has(String(local.id))) return;

    const isDuplicate = dbOrders.some(db =>
      Number(db.total) === Number(local.total) &&
      Math.abs(new Date(db.created_at) - new Date(local.created_at)) < 120000
    );
    if (isDuplicate) return;

    merged.push(local);
  });

  return merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

async function updateOrderStatus(orderId, status) {
  updateOrderStatusLocal(orderId, status);

  if (!getSupabaseAdmin()) {
    return { error: null };
  }

  return await updateOrderStatusInDb(orderId, status);
}

async function fetchAllOrdersFromDb() {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

async function updateOrderStatusInDb(orderId, status) {
  const admin = getSupabaseAdmin();
  if (!admin) return { error: 'Supabase admin не налаштовано' };

  const { error } = await admin.from('orders').update({ status }).eq('id', orderId);
  if (error) return { error: error.message };
  return { error: null };
}

const PRODUCT_IMAGES_BUCKET = 'product-images';

function dbProductToApp(row) {
  return {
    id: Number(row.id),
    name: row.name,
    category: row.category,
    price: Number(row.price),
    salePrice: row.sale_price != null ? Number(row.sale_price) : null,
    badge: row.badge || null,
    description: row.description || '',
    fullDescription: row.full_description || row.description || '',
    specs: Array.isArray(row.specs) ? row.specs : [],
    image: row.image || null,
    images: Array.isArray(row.images) ? row.images.filter(Boolean) : [],
    inStock: row.in_stock !== false
  };
}

function appProductToDb(product) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: product.price,
    sale_price: product.salePrice ?? null,
    badge: product.badge || null,
    description: product.description,
    full_description: product.fullDescription || product.description,
    specs: product.specs || [],
    image: product.image || null,
    images: product.images || [],
    in_stock: product.inStock !== false,
    updated_at: new Date().toISOString()
  };
}

function needsImageUpload(src) {
  return Boolean(src && (src.startsWith('data:') || src.startsWith('blob:')));
}

async function uploadProductImageToStorage(admin, src, productId, filename) {
  if (!src || !needsImageUpload(src)) return src;

  try {
    const response = await fetch(src);
    const blob = await response.blob();
    const ext = blob.type === 'image/png' ? 'png' : 'jpg';
    const path = `${productId}/${filename.replace(/\.\w+$/, '')}.${ext}`;

    const { error } = await admin.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(path, blob, { upsert: true, contentType: blob.type || 'image/jpeg' });

    if (error) {
      console.warn('Upload image:', error.message);
      return src;
    }

    const { data } = admin.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.warn('Upload image failed:', err);
    return src;
  }
}

async function syncProductImagesToStorage(product) {
  const admin = getSupabaseAdmin();
  if (!admin) return product;

  const image = product.image
    ? await uploadProductImageToStorage(admin, product.image, product.id, 'main.jpg')
    : null;

  const images = [];
  for (let i = 0; i < (product.images || []).length; i++) {
    const uploaded = await uploadProductImageToStorage(
      admin,
      product.images[i],
      product.id,
      `extra-${i + 1}.jpg`
    );
    if (uploaded) images.push(uploaded);
  }

  return { ...product, image, images };
}

async function fetchProductsFromDb() {
  const client = getSupabase() || getSupabaseAdmin();
  if (!client) return null;

  const { data, error } = await client
    .from('products')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.warn('Supabase products:', error.message);
    return null;
  }

  return (data || []).map(dbProductToApp);
}

async function saveProductToDb(product) {
  const admin = getSupabaseAdmin();
  if (!admin) return { error: null };

  const payload = appProductToDb(product);
  const { error } = await admin.from('products').upsert(payload, { onConflict: 'id' });
  if (error) return { error: error.message };
  return { error: null };
}

async function deleteProductFromDb(productId) {
  const admin = getSupabaseAdmin();
  if (!admin) return { error: null };

  const { error } = await admin.from('products').delete().eq('id', productId);
  if (error) return { error: error.message };
  return { error: null };
}

async function syncAllProductsToDb(products) {
  const admin = getSupabaseAdmin();
  if (!admin) return { error: null, synced: 0 };

  let synced = 0;
  for (const product of products) {
    const withImages = await syncProductImagesToStorage(product);
    const { error } = await saveProductToDb(withImages);
    if (!error) synced++;
  }
  return { error: null, synced };
}
