// Menu page logic
let allProducts = [];
let allCategories = [];
let activeCategory = 'all';

document.addEventListener('DOMContentLoaded', async () => {
    // Set table number
    const tableNum = getTableNumber();
    document.getElementById('tableNumber').textContent = tableNum;

    // Load data
    await loadMenu();

    // Update cart UI
    cart.updateUI();
});

async function loadMenu() {
    try {
        const [categories, products] = await Promise.all([
            api.get('/api/categories'),
            api.get('/api/products')
        ]);

        allCategories = categories;
        allProducts = products;

        renderCategories(categories);
        renderProducts(products, categories);
    } catch (error) {
        console.error('Failed to load menu:', error);
        document.getElementById('productsContainer').innerHTML = `
      <div class="empty-state">
        <div class="icon">😔</div>
        <h3>Không thể tải menu</h3>
        <p>Vui lòng thử lại sau</p>
      </div>
    `;
    }
}

function renderCategories(categories) {
    const container = document.getElementById('categoryTabs');
    container.innerHTML = `<button class="tab-btn active" data-category="all" onclick="filterCategory('all')">📋 Tất cả</button>`;

    categories.forEach(cat => {
        container.innerHTML += `
      <button class="tab-btn" data-category="${cat.id}" onclick="filterCategory(${cat.id})">
        ${cat.icon} ${cat.name}
      </button>
    `;
    });
}

function filterCategory(categoryId) {
    activeCategory = categoryId;

    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category == categoryId);
    });

    // Scroll active tab into view
    const activeBtn = document.querySelector('.tab-btn.active');
    if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });

    renderProducts(allProducts, allCategories);
}

function renderProducts(products, categories) {
    const container = document.getElementById('productsContainer');

    if (activeCategory !== 'all') {
        const filtered = products.filter(p => p.category_id == activeCategory);
        const cat = categories.find(c => c.id == activeCategory);
        container.innerHTML = `
      <h2 class="category-title">${cat?.icon || ''} ${cat?.name || ''}</h2>
      <div class="product-grid">
        ${filtered.map(p => productCard(p)).join('')}
      </div>
    `;
        return;
    }

    // Group by category
    let html = '';
    categories.forEach(cat => {
        const catProducts = products.filter(p => p.category_id === cat.id);
        if (catProducts.length === 0) return;

        html += `
      <h2 class="category-title">${cat.icon} ${cat.name}</h2>
      <div class="product-grid">
        ${catProducts.map(p => productCard(p)).join('')}
      </div>
    `;
    });

    container.innerHTML = html || `
    <div class="empty-state">
      <div class="icon">🍽️</div>
      <h3>Chưa có món nào</h3>
    </div>
  `;
}

function productCard(product) {
    const imgContent = product.image
        ? `<img src="${product.image}" alt="${product.name}" loading="lazy">`
        : `<span class="emoji-placeholder">${getProductEmoji(product.name)}</span>`;

    return `
    <div class="product-card ${product.is_available ? '' : 'unavailable'}" onclick="openProductModal(${product.id})">
      <div class="product-img">${imgContent}</div>
      <div class="product-info">
        <div class="product-name">${product.name}</div>
        <div class="product-desc">${product.description}</div>
        <div class="product-bottom">
          <span class="product-price">${formatMoney(product.price)}</span>
          <button class="btn-add" onclick="event.stopPropagation(); quickAdd(${product.id})">+</button>
        </div>
      </div>
    </div>
  `;
}

function quickAdd(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const defaultSize = product.sizes?.length > 0 ? product.sizes[0].name : '';

    cart.add({
        product_id: product.id,
        name: product.name,
        price: product.price + (product.sizes?.[0]?.price || 0),
        image: product.image,
        size: defaultSize,
        toppings: [],
        note: '',
        quantity: 1,
    });

    showToast(`Đã thêm ${product.name}`, 'success');
}

// Product Detail Modal
function openProductModal(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const imgContent = product.image
        ? `<img src="${product.image}" alt="${product.name}">`
        : `<span>${getProductEmoji(product.name)}</span>`;

    let sizesHtml = '';
    if (product.sizes && product.sizes.length > 0) {
        sizesHtml = `
      <div class="option-group">
        <div class="option-label">📐 Chọn size</div>
        <div class="option-list">
          ${product.sizes.map((s, i) => `
            <div class="option-chip ${i === 0 ? 'selected' : ''}" data-size="${s.name}" data-price="${s.price}" onclick="selectSize(this)">
              ${s.name} ${s.price > 0 ? `<span class="price-extra">+${formatMoney(s.price)}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
    }

    let toppingsHtml = '';
    if (product.toppings && product.toppings.length > 0) {
        toppingsHtml = `
      <div class="option-group">
        <div class="option-label">🫧 Chọn topping</div>
        <div class="option-list">
          ${product.toppings.map(t => `
            <div class="option-chip" data-topping="${t.name}" data-price="${t.price}" onclick="toggleTopping(this)">
              ${t.name} <span class="price-extra">+${formatMoney(t.price)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    }

    document.getElementById('productDetail').innerHTML = `
    <div class="detail-img">${imgContent}</div>
    <div class="detail-name">${product.name}</div>
    <div class="detail-desc">${product.description}</div>
    <div class="detail-price" id="detailPrice">${formatMoney(product.price)}</div>
    
    ${sizesHtml}
    ${toppingsHtml}
    
    <div class="option-group">
      <div class="option-label">📝 Ghi chú</div>
      <textarea class="note-input" id="itemNote" rows="2" placeholder="Ít đường, không đá, thêm đá..."></textarea>
    </div>
    
    <div class="quantity-selector">
      <button class="qty-btn" onclick="changeQty(-1)">−</button>
      <span class="qty-value" id="qtyValue">1</span>
      <button class="qty-btn" onclick="changeQty(1)">+</button>
    </div>
    
    <button class="btn-add-cart" onclick="addToCartFromModal(${product.id})">
      🛒 Thêm vào giỏ - <span id="modalTotalPrice">${formatMoney(product.price)}</span>
    </button>
  `;

    document.getElementById('productModal').classList.add('active');
    document.body.style.overflow = 'hidden';

    // Store current product for price calculation
    window._currentProduct = product;
    window._currentQty = 1;
    updateModalPrice();
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
    document.body.style.overflow = '';
}

// Close on overlay click
document.getElementById('productModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeProductModal();
});

function selectSize(el) {
    el.parentElement.querySelectorAll('.option-chip').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    updateModalPrice();
}

function toggleTopping(el) {
    el.classList.toggle('selected');
    updateModalPrice();
}

function changeQty(delta) {
    window._currentQty = Math.max(1, (window._currentQty || 1) + delta);
    document.getElementById('qtyValue').textContent = window._currentQty;
    updateModalPrice();
}

function updateModalPrice() {
    const product = window._currentProduct;
    if (!product) return;

    let price = product.price;

    // Add size price
    const selectedSize = document.querySelector('[data-size].selected');
    if (selectedSize) price += parseInt(selectedSize.dataset.price) || 0;

    // Add topping prices
    document.querySelectorAll('[data-topping].selected').forEach(t => {
        price += parseInt(t.dataset.price) || 0;
    });

    const total = price * (window._currentQty || 1);

    const detailPrice = document.getElementById('detailPrice');
    const modalTotal = document.getElementById('modalTotalPrice');
    if (detailPrice) detailPrice.textContent = formatMoney(price);
    if (modalTotal) modalTotal.textContent = formatMoney(total);
}

function addToCartFromModal(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    // Get selected options
    const selectedSizeEl = document.querySelector('[data-size].selected');
    const selectedSize = selectedSizeEl ? selectedSizeEl.dataset.size : '';
    const sizePrice = selectedSizeEl ? parseInt(selectedSizeEl.dataset.price) || 0 : 0;

    const selectedToppings = [];
    let toppingsPrice = 0;
    document.querySelectorAll('[data-topping].selected').forEach(t => {
        selectedToppings.push(t.dataset.topping);
        toppingsPrice += parseInt(t.dataset.price) || 0;
    });

    const note = document.getElementById('itemNote')?.value || '';
    const quantity = window._currentQty || 1;
    const unitPrice = product.price + sizePrice + toppingsPrice;

    cart.add({
        product_id: product.id,
        name: product.name,
        price: unitPrice,
        image: product.image,
        size: selectedSize,
        toppings: selectedToppings,
        note,
        quantity
    });

    closeProductModal();
    showToast(`Đã thêm ${product.name} x${quantity}`, 'success');
}
