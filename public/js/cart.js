document.addEventListener('DOMContentLoaded', () => {
    const tableNum = getTableNumber();
    document.getElementById('tableNumber').textContent = tableNum;
    document.getElementById('backBtn').href = `/?table=${tableNum}`;
    renderCart();
});

function renderCart() {
    const container = document.getElementById('cartContainer');
    const items = cart.getAll();

    if (items.length === 0) {
        container.innerHTML = `
      <div class="empty-state">
        <div class="icon">🛒</div>
        <h3>Giỏ hàng trống</h3>
        <p>Hãy thêm món từ menu</p>
        <a href="/?table=${getTableNumber()}" class="btn btn-primary" style="margin-top:16px">📋 Xem Menu</a>
      </div>
    `;
        return;
    }

    const itemsHtml = items.map(item => {
        const emoji = getProductEmoji(item.name);
        const imgContent = item.image
            ? `<img src="${item.image}" alt="${item.name}">`
            : emoji;

        let details = [];
        if (item.size) details.push(item.size);
        if (item.toppings && item.toppings.length > 0) details.push(item.toppings.join(', '));

        return `
      <div class="cart-item" data-id="${item.id}">
        <div class="cart-item-img">${imgContent}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          ${details.length ? `<div class="cart-item-details">${details.join(' • ')}</div>` : ''}
          ${item.note ? `<div class="cart-item-note">📝 ${item.note}</div>` : ''}
          <div class="cart-item-bottom">
            <span class="cart-item-price">${formatMoney(item.price * item.quantity)}</span>
            <div class="cart-qty">
              <button onclick="updateQty(${item.id}, ${item.quantity - 1})">−</button>
              <span>${item.quantity}</span>
              <button onclick="updateQty(${item.id}, ${item.quantity + 1})">+</button>
            </div>
          </div>
        </div>
        <button class="cart-delete" onclick="removeItem(${item.id})" title="Xóa">🗑️</button>
      </div>
    `;
    }).join('');

    const total = cart.getTotal();
    const count = cart.getCount();

    container.innerHTML = `
    <ul class="cart-items">${itemsHtml}</ul>
    
    <div class="cart-summary">
      <div class="summary-row">
        <span>Số lượng</span>
        <span>${count} món</span>
      </div>
      <div class="summary-row total">
        <span>Tổng cộng</span>
        <span class="amount">${formatMoney(total)}</span>
      </div>
    </div>
    
    <button class="btn btn-primary btn-block btn-lg" style="margin-top:20px" onclick="goToCheckout()">
      Đặt hàng - ${formatMoney(total)} →
    </button>
    
    <button class="btn btn-outline btn-block" style="margin-top:10px" onclick="clearAll()">
      🗑️ Xóa tất cả
    </button>
  `;
}

function updateQty(id, newQty) {
    if (newQty <= 0) {
        removeItem(id);
        return;
    }
    cart.update(id, newQty);
    renderCart();
}

function removeItem(id) {
    cart.remove(id);
    renderCart();
    showToast('Đã xóa khỏi giỏ hàng');
}

function clearAll() {
    if (confirm('Xóa tất cả món trong giỏ hàng?')) {
        cart.clear();
        renderCart();
    }
}

function goToCheckout() {
    window.location.href = `/checkout.html?table=${getTableNumber()}`;
}
