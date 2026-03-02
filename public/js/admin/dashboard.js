// Check auth
if (!localStorage.getItem('admin_token')) window.location.href = '/admin/login.html';

let soundEnabled = true;
let allOrders = [];

document.addEventListener('DOMContentLoaded', async () => {
    await loadDashboard();

    // WebSocket for real-time
    connectWebSocket((data) => {
        if (data.type === 'new_order') {
            playNotificationSound();
            loadDashboard();
        } else if (data.type === 'order_status_changed' || data.type === 'order_updated') {
            loadDashboard();
        }
    });

    // Auto-refresh every 30s
    setInterval(loadDashboard, 30000);
});

async function loadDashboard() {
    try {
        const [orders, stats, tables] = await Promise.all([
            api.get('/api/orders'),
            api.get('/api/stats/today'),
            api.get('/api/tables'),
        ]);

        allOrders = orders;
        renderStats(stats, tables);
        renderKanban(orders);
    } catch (err) {
        console.error('Dashboard load error:', err);
    }
}

function renderStats(stats, tables) {
    const occupiedTables = tables.filter(t => t.status === 'occupied').length;
    document.getElementById('statOrders').textContent = stats.total_orders || 0;
    document.getElementById('statRevenue').textContent = formatMoney(stats.total_revenue || 0);
    document.getElementById('statTables').textContent = `${occupiedTables}/${tables.length}`;

    const pending = allOrders.filter(o => o.status === 'new').length;
    document.getElementById('statPending').textContent = pending;
}

function renderKanban(orders) {
    const columns = { new: [], preparing: [], ready: [], completed: [] };

    // Only show today's active orders + recent completed
    const today = new Date().toISOString().split('T')[0];
    orders.forEach(order => {
        const orderDate = order.created_at?.split('T')[0] || order.created_at?.split(' ')[0];
        if (columns[order.status] !== undefined) {
            if (order.status === 'completed' || order.status === 'paid') {
                if (orderDate === today) columns.completed.push(order);
            } else {
                columns[order.status].push(order);
            }
        }
    });

    for (const [status, statusOrders] of Object.entries(columns)) {
        const container = document.getElementById(`cards${capitalize(status)}`);
        const countEl = document.getElementById(`count${capitalize(status)}`);
        if (countEl) countEl.textContent = statusOrders.length;

        if (container) {
            container.innerHTML = statusOrders.length === 0
                ? '<p style="color:var(--text-light);font-size:0.85rem;text-align:center;padding:20px">Không có đơn</p>'
                : statusOrders.map(order => orderCard(order)).join('');
        }
    }
}

function orderCard(order) {
    const items = order.items || [];
    let itemsText = '';

    if (items.length > 0) {
        itemsText = items.map(i => `${i.product_name} x${i.quantity}`).join(', ');
    } else {
        // Fetch items separately (for list endpoint)
        itemsText = '<em>Đang tải...</em>';
        loadOrderItems(order.id);
    }

    const timeAgo = getTimeAgo(order.created_at);
    const nextStatus = getNextStatus(order.status);

    let actionsHtml = '';
    if (nextStatus) {
        actionsHtml = `
      <div class="order-card-actions">
        <button class="btn-next-status" onclick="event.stopPropagation();changeStatus(${order.id},'${nextStatus.key}')">
          ${nextStatus.icon} ${nextStatus.label}
        </button>
        ${order.status === 'new' ? `<button class="btn-cancel-order" onclick="event.stopPropagation();changeStatus(${order.id},'cancelled')">✕</button>` : ''}
      </div>
    `;
    }

    return `
    <div class="order-card" data-status="${order.status}" onclick="viewOrderDetail(${order.id})">
      <div class="order-card-header">
        <span class="order-card-id">#${order.id}</span>
        <span class="order-card-table">🪑 Bàn ${order.table_number}</span>
      </div>
      <div class="order-card-items">${itemsText}</div>
      <div class="order-card-footer">
        <span class="order-card-amount">${formatMoney(order.total_amount)}</span>
        <span class="order-card-time">${timeAgo}</span>
      </div>
      ${actionsHtml}
    </div>
  `;
}

async function loadOrderItems(orderId) {
    try {
        const order = await api.get(`/api/orders/${orderId}`);
        const card = document.querySelector(`.order-card[onclick*="${orderId}"] .order-card-items`);
        if (card && order.items) {
            card.textContent = order.items.map(i => `${i.product_name} x${i.quantity}`).join(', ');
        }
    } catch (e) { }
}

async function changeStatus(orderId, newStatus) {
    try {
        await api.put(`/api/orders/${orderId}/status`, { status: newStatus });
        await loadDashboard();
    } catch (err) {
        alert('Lỗi cập nhật: ' + err.message);
    }
}

async function viewOrderDetail(orderId) {
    try {
        const order = await api.get(`/api/orders/${orderId}`);
        const items = (order.items || []).map(i => {
            const toppings = (typeof i.toppings === 'string' ? JSON.parse(i.toppings) : i.toppings) || [];
            let detail = `• ${i.product_name} x${i.quantity}`;
            if (i.size) detail += ` (${i.size})`;
            if (toppings.length) detail += ` + ${toppings.join(', ')}`;
            if (i.note) detail += ` [${i.note}]`;
            detail += ` — ${formatMoney(i.subtotal)}`;
            return detail;
        }).join('\n');

        const payment = order.payment_method === 'vietqr' ? 'VietQR' : 'Tại quầy';
        const payStatus = order.payment_status === 'paid' ? '✅ Đã TT' : '⏳ Chưa TT';

        alert(
            `Đơn #${order.id} — Bàn ${order.table_number}\n` +
            `Trạng thái: ${order.status}\n` +
            `Thanh toán: ${payment} (${payStatus})\n` +
            `Tổng: ${formatMoney(order.total_amount)}\n\n` +
            `Chi tiết:\n${items}\n` +
            (order.note ? `\nGhi chú: ${order.note}` : '')
        );
    } catch (e) {
        alert('Lỗi tải chi tiết đơn');
    }
}

function getNextStatus(current) {
    const map = {
        new: { key: 'preparing', label: 'Bắt đầu làm', icon: '👨‍🍳' },
        preparing: { key: 'ready', label: 'Sẵn sàng', icon: '✅' },
        ready: { key: 'completed', label: 'Hoàn thành', icon: '🎉' },
        completed: { key: 'paid', label: 'Đã thanh toán', icon: '💰' },
    };
    return map[current] || null;
}

function getTimeAgo(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHr = Math.floor(diffMin / 60);
    return `${diffHr}h trước`;
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// Sound
function toggleSound() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('soundToggle');
    btn.textContent = soundEnabled ? '🔔 Âm thanh: BẬT' : '🔕 Âm thanh: TẮT';
}

function playNotificationSound() {
    if (!soundEnabled) return;
    try {
        // Use Web Audio API for notification
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);

        // Second beep
        setTimeout(() => {
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.frequency.value = 1100;
            osc2.type = 'sine';
            gain2.gain.setValueAtTime(0.3, ctx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc2.start(ctx.currentTime);
            osc2.stop(ctx.currentTime + 0.3);
        }, 200);
    } catch (e) { }
}

function logout() {
    localStorage.removeItem('admin_token');
    window.location.href = '/admin/login.html';
}
