const statusMap = {
    new: { label: 'Đã nhận đơn', icon: '📩', desc: 'Đơn hàng đã được gửi đến quán' },
    preparing: { label: 'Đang pha chế', icon: '👨‍🍳', desc: 'Quán đang chuẩn bị món cho bạn' },
    ready: { label: 'Sẵn sàng', icon: '✅', desc: 'Món của bạn đã sẵn sàng!' },
    completed: { label: 'Hoàn thành', icon: '🎉', desc: 'Đơn hàng đã hoàn thành' },
    paid: { label: 'Đã thanh toán', icon: '💰', desc: 'Cảm ơn bạn!' },
    cancelled: { label: 'Đã hủy', icon: '❌', desc: 'Đơn hàng đã bị hủy' },
};

const statusOrder = ['new', 'preparing', 'ready', 'completed'];

let currentOrderId = null;

document.addEventListener('DOMContentLoaded', async () => {
    const tableNum = getTableNumber();
    document.getElementById('tableNumber').textContent = tableNum;
    document.getElementById('backBtn').href = `/?table=${tableNum}`;

    const params = new URLSearchParams(window.location.search);
    currentOrderId = params.get('order');

    if (currentOrderId) {
        await loadOrder(currentOrderId);
    } else {
        await loadTableOrders(tableNum);
    }

    // WebSocket for real-time updates
    connectWebSocket((data) => {
        if (data.type === 'order_status_changed' && data.order) {
            if (currentOrderId && data.order.id == currentOrderId) {
                renderOrderStatus(data.order);
                showToast(`Đơn #${data.order.id}: ${statusMap[data.order.status]?.label}`, 'success');
            }
        }
    });
});

async function loadOrder(orderId) {
    try {
        const order = await api.get(`/api/orders/${orderId}`);
        renderOrderStatus(order);
    } catch (error) {
        document.getElementById('statusContainer').innerHTML = `
      <div class="empty-state"><div class="icon">😔</div><h3>Không tìm thấy đơn hàng</h3></div>
    `;
    }
}

async function loadTableOrders(tableNum) {
    try {
        const orders = await api.get(`/api/orders/table/${tableNum}`);
        if (orders.length === 0) {
            document.getElementById('statusContainer').innerHTML = `
        <div class="empty-state">
          <div class="icon">🍽️</div>
          <h3>Chưa có đơn hàng</h3>
          <p>Hãy đặt món từ menu</p>
          <a href="/?table=${tableNum}" class="btn btn-primary" style="margin-top:16px">📋 Xem Menu</a>
        </div>
      `;
            return;
        }
        // Show latest order
        currentOrderId = orders[0].id;
        renderOrderStatus(orders[0]);
    } catch (error) {
        console.error('Failed to load orders:', error);
    }
}

function renderOrderStatus(order) {
    const container = document.getElementById('statusContainer');
    const currentIdx = statusOrder.indexOf(order.status);

    const timelineHtml = statusOrder.map((status, i) => {
        const info = statusMap[status];
        let stateClass = '';
        if (i < currentIdx) stateClass = 'completed';
        else if (i === currentIdx) stateClass = 'active';

        return `
      <div class="timeline-step ${stateClass}">
        <div class="timeline-dot">${info.icon}</div>
        <div class="timeline-content">
          <h3>${info.label}</h3>
          <p>${info.desc}</p>
        </div>
      </div>
    `;
    }).join('');

    const itemsHtml = (order.items || []).map(item => {
        const toppings = typeof item.toppings === 'string' ? JSON.parse(item.toppings) : (item.toppings || []);
        let details = [];
        if (item.size) details.push(item.size);
        if (toppings.length) details.push(toppings.join(', '));

        return `
      <div class="summary-row">
        <span>${getProductEmoji(item.product_name)} ${item.product_name} x${item.quantity}${details.length ? ` (${details.join(', ')})` : ''}</span>
        <span>${formatMoney(item.subtotal)}</span>
      </div>
    `;
    }).join('');

    const paymentLabel = order.payment_method === 'vietqr' ? '💳 VietQR' : '💵 Tại quầy';
    const paymentStatus = order.payment_status === 'paid' ? '✅ Đã thanh toán' : '⏳ Chưa thanh toán';

    container.innerHTML = `
    <div class="order-info-card">
      <h3>📋 Đơn hàng <span class="order-id">#${order.id}</span></h3>
      <div class="summary-row">
        <span>Bàn</span><span>🪑 ${order.table_number}</span>
      </div>
      <div class="summary-row">
        <span>Thanh toán</span><span>${paymentLabel}</span>
      </div>
      <div class="summary-row">
        <span>Trạng thái TT</span><span>${paymentStatus}</span>
      </div>
      <div class="summary-row">
        <span>Thời gian</span><span>${new Date(order.created_at).toLocaleString('vi-VN')}</span>
      </div>
    </div>
    
    <div class="order-info-card">
      <h3>🍽️ Chi tiết món</h3>
      ${itemsHtml}
      <div class="summary-row total">
        <span>Tổng cộng</span>
        <span class="amount">${formatMoney(order.total_amount)}</span>
      </div>
    </div>
    
    <h3 style="margin:20px 0 8px; font-family:var(--font-primary)">📦 Trạng thái đơn hàng</h3>
    <div class="status-timeline">${timelineHtml}</div>
    
    <button class="btn btn-primary btn-block" style="margin-top:16px" onclick="window.location.href='/?table=${order.table_number}'">
      ➕ Gọi thêm món
    </button>
  `;
}
