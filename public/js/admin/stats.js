if (!localStorage.getItem('admin_token')) window.location.href = '/admin/login.html';

document.addEventListener('DOMContentLoaded', () => loadStats());

async function loadStats() {
    const days = document.getElementById('chartDays').value;
    try {
        const [todayStats, chart, topProducts] = await Promise.all([
            api.get('/api/stats/today'),
            api.get(`/api/stats/chart?days=${days}`),
            api.get(`/api/stats/top-products?days=${days}`)
        ]);
        renderStatsCards(todayStats);
        renderChart(chart);
        renderTopProducts(topProducts);
    } catch (e) { console.error(e); }
}

function renderStatsCards(s) {
    document.getElementById('statsCards').innerHTML = `
    <div class="stat-card"><div class="stat-icon orange">📦</div>
      <div class="stat-value">${s.total_orders || 0}</div><div class="stat-label">Tổng đơn hôm nay</div></div>
    <div class="stat-card"><div class="stat-icon green">💰</div>
      <div class="stat-value">${formatMoney(s.total_revenue || 0)}</div><div class="stat-label">Doanh thu</div></div>
    <div class="stat-card"><div class="stat-icon blue">💳</div>
      <div class="stat-value">${s.vietqr_orders || 0} / ${s.cash_orders || 0}</div><div class="stat-label">VietQR / Tiền mặt</div></div>
    <div class="stat-card"><div class="stat-icon yellow">📊</div>
      <div class="stat-value">${formatMoney(s.avg_order_value || 0)}</div><div class="stat-label">Giá trị TB/đơn</div></div>
  `;
}

function renderChart(data) {
    const maxRevenue = Math.max(...data.map(d => d.revenue), 1);
    document.getElementById('revenueChart').innerHTML = data.map(d => {
        const height = Math.max((d.revenue / maxRevenue) * 100, 2);
        return `<div class="bar-item">
      <div class="bar-value">${d.revenue > 0 ? formatMoney(d.revenue) : ''}</div>
      <div class="bar" style="height:${height}%" title="${formatMoney(d.revenue)}"></div>
      <div class="bar-label">${d.label}</div>
    </div>`;
    }).join('');
}

function renderTopProducts(products) {
    if (products.length === 0) {
        document.getElementById('topProducts').innerHTML = '<p style="color:var(--text-light);padding:20px;text-align:center">Chưa có dữ liệu</p>';
        return;
    }
    const maxQty = Math.max(...products.map(p => p.total_quantity));
    document.getElementById('topProducts').innerHTML = `
    <table class="menu-table"><thead><tr><th>#</th><th>Sản phẩm</th><th>Số lượng</th><th>Doanh thu</th></tr></thead>
    <tbody>${products.map((p, i) => `<tr>
      <td><strong>${i + 1}</strong></td>
      <td>${getProductEmoji(p.product_name)} ${p.product_name}</td>
      <td><div style="display:flex;align-items:center;gap:8px">
        <div style="flex:1;height:8px;background:var(--border);border-radius:4px;overflow:hidden">
          <div style="width:${(p.total_quantity / maxQty) * 100}%;height:100%;background:var(--primary);border-radius:4px"></div>
        </div>
        <strong>${p.total_quantity}</strong>
      </div></td>
      <td>${formatMoney(p.total_revenue)}</td>
    </tr>`).join('')}</tbody></table>
  `;
}

function logout() {
    localStorage.removeItem('admin_token');
    window.location.href = '/admin/login.html';
}
