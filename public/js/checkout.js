let selectedPayment = 'cash';

document.addEventListener('DOMContentLoaded', () => {
    const tableNum = getTableNumber();
    document.getElementById('tableNumber').textContent = tableNum;
    document.getElementById('backBtn').href = `/cart.html?table=${tableNum}`;
    renderCheckout();
});

function renderCheckout() {
    const container = document.getElementById('checkoutContainer');
    const items = cart.getAll();

    if (items.length === 0) {
        container.innerHTML = `
      <div class="empty-state">
        <div class="icon">🛒</div>
        <h3>Giỏ hàng trống</h3>
        <p>Hãy thêm món trước khi thanh toán</p>
        <a href="/?table=${getTableNumber()}" class="btn btn-primary" style="margin-top:16px">📋 Xem Menu</a>
      </div>
    `;
        return;
    }

    const total = cart.getTotal();
    const count = cart.getCount();

    const itemsSummary = items.map(item => {
        let details = [];
        if (item.size) details.push(item.size);
        if (item.toppings?.length) details.push(item.toppings.join(', '));
        return `
      <div class="summary-row">
        <span>${item.name} x${item.quantity}${details.length ? ` (${details.join(', ')})` : ''}</span>
        <span>${formatMoney(item.price * item.quantity)}</span>
      </div>
    `;
    }).join('');

    container.innerHTML = `
    <div class="order-info-card">
      <h3>📋 Đơn hàng của bạn</h3>
      ${itemsSummary}
      <div class="summary-row total">
        <span>Tổng cộng (${count} món)</span>
        <span class="amount">${formatMoney(total)}</span>
      </div>
    </div>
    
    <div class="checkout-note">
      <label>📝 Ghi chú cho đơn hàng</label>
      <textarea class="note-input" id="orderNote" rows="2" placeholder="Ghi chú chung cho đơn hàng..."></textarea>
    </div>
    
    <h3 style="margin-bottom:8px; font-family:var(--font-primary)">💳 Chọn cách thanh toán</h3>
    
    <div class="payment-options">
      <div class="payment-option selected" onclick="selectPayment('cash')" data-payment="cash">
        <div class="payment-icon"><span>💵</span></div>
        <div class="payment-info">
          <h3>Thanh toán tại quầy</h3>
          <p>Thanh toán bằng tiền mặt hoặc quẹt thẻ tại quầy</p>
        </div>
      </div>
      <div class="payment-option" onclick="selectPayment('vietqr')" data-payment="vietqr">
        <div class="payment-icon"><span>📱</span></div>
        <div class="payment-info">
          <h3>Chuyển khoản VietQR</h3>
          <p>Quét mã QR chuyển khoản ngân hàng</p>
        </div>
      </div>
    </div>
    
    <button class="btn btn-primary btn-block btn-lg" style="margin-top:20px" onclick="placeOrder()" id="btnPlaceOrder">
      ✅ Xác nhận đặt hàng - ${formatMoney(total)}
    </button>
  `;
}

function selectPayment(method) {
    selectedPayment = method;
    document.querySelectorAll('.payment-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.payment === method);
    });
}

async function placeOrder() {
    const btn = document.getElementById('btnPlaceOrder');
    btn.disabled = true;
    btn.innerHTML = '⏳ Đang xử lý...';

    try {
        const items = cart.getAll().map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            size: item.size,
            toppings: item.toppings,
            note: item.note,
        }));

        const orderNote = document.getElementById('orderNote')?.value || '';

        const result = await api.post('/api/orders', {
            table_number: getTableNumber(),
            items,
            payment_method: selectedPayment,
            note: orderNote,
        });

        // Clear cart
        cart.clear();

        // Redirect to order status or show VietQR
        if (selectedPayment === 'vietqr' && result.vietqr) {
            showVietQR(result);
        } else {
            window.location.href = `/order-status.html?table=${getTableNumber()}&order=${result.id}`;
        }

    } catch (error) {
        console.error('Order failed:', error);
        showToast('Đặt hàng thất bại. Vui lòng thử lại!', 'error');
        btn.disabled = false;
        btn.innerHTML = '✅ Xác nhận đặt hàng';
    }
}

function showVietQR(order) {
    const container = document.getElementById('checkoutContainer');
    container.innerHTML = `
    <div class="order-info-card" style="text-align:center">
      <h3 style="justify-content:center">✅ Đơn hàng #${order.id} đã được tạo!</h3>
      <p style="color:var(--text-secondary);margin-bottom:16px">Bàn ${order.table_number} • ${formatMoney(order.total_amount)}</p>
    </div>
    
    <div class="vietqr-container">
      <h3 style="margin-bottom:12px; font-family:var(--font-primary)">📱 Quét mã để chuyển khoản</h3>
      <img src="${order.vietqr.qrUrl}" alt="VietQR">
      <div class="vietqr-info">
        <p><strong>Ngân hàng:</strong> ${order.vietqr.bankId}</p>
        <p><strong>STK:</strong> ${order.vietqr.accountNo}</p>
        <p><strong>Tên:</strong> ${order.vietqr.accountName}</p>
        <p><strong>Số tiền:</strong> ${formatMoney(order.vietqr.amount)}</p>
        <p><strong>Nội dung:</strong> ${order.vietqr.memo}</p>
      </div>
    </div>
    
    <button class="btn btn-primary btn-block btn-lg" style="margin-top:16px" 
      onclick="window.location.href='/order-status.html?table=${order.table_number}&order=${order.id}'">
      📋 Xem trạng thái đơn hàng →
    </button>
    
    <button class="btn btn-outline btn-block" style="margin-top:8px" 
      onclick="window.location.href='/?table=${order.table_number}'">
      ➕ Gọi thêm món
    </button>
  `;
}
