if (!localStorage.getItem('admin_token')) window.location.href = '/admin/login.html';

document.addEventListener('DOMContentLoaded', () => {
    loadTables();
    connectWebSocket(() => loadTables());
    setInterval(loadTables, 15000);
});

async function loadTables() {
    try {
        const tables = await api.get('/api/tables');
        renderTables(tables);
    } catch (e) { console.error(e); }
}

function getBaseUrl() {
    return window.location.origin;
}

async function renderTables(tables) {
    const grid = document.getElementById('tablesGrid');
    const occupied = tables.filter(t => t.status === 'occupied').length;
    document.getElementById('tableStats').textContent = `🟢 ${tables.length - occupied} trống | 🔴 ${occupied} có khách | Tổng: ${tables.length} bàn`;

    const baseUrl = getBaseUrl();

    grid.innerHTML = tables.map(t => `
    <div class="table-card ${t.status}">
      <div class="table-number">${t.number}</div>
      <div class="table-status">${t.status === 'empty' ? '🟢 Trống' : '🔴 Có khách'}</div>
      <div class="table-qr" id="qr-table-${t.number}"><span style="color:var(--text-light);font-size:0.8rem">Đang tạo QR...</span></div>
      <div class="table-url">${baseUrl}/?table=${t.number}</div>
      ${t.current_order ? `<div class="table-order-info">
        Đơn #${t.current_order.id}<br>${formatMoney(t.current_order.total_amount)}
      </div>` : ''}
      <div class="table-actions">
        ${t.status === 'occupied' ? `<button class="btn-admin btn-admin-secondary btn-sm" onclick="event.stopPropagation(); toggleStatus('${t.id}', '${t.status}', ${t.number})">🔄 Đổi trống</button>` : ''}
        <button class="btn-admin btn-admin-danger btn-sm" onclick="event.stopPropagation(); deleteTable('${t.id}', ${t.number}, '${t.status}')">🗑️ Xóa</button>
      </div>
    </div>
  `).join('');

    // Generate QR codes for each table via server API
    for (const t of tables) {
        const container = document.getElementById(`qr-table-${t.number}`);
        if (container) {
            try {
                const url = `${baseUrl}/?table=${t.number}`;
                const result = await api.get(`/api/qrcode?text=${encodeURIComponent(url)}`);
                container.innerHTML = `<img src="${result.dataUrl}" alt="QR Bàn ${t.number}" style="width:120px;height:120px;border-radius:8px;border:2px solid var(--border)">`;
            } catch (err) {
                container.innerHTML = '<span style="font-size:0.75rem;color:var(--danger)">Lỗi tạo QR</span>';
            }
        }
    }
}

async function toggleStatus(id, currentStatus, number) {
    const newStatus = currentStatus === 'occupied' ? 'empty' : 'occupied';
    if (currentStatus === 'occupied') {
        if (!confirm(`Bàn ${number} đang có khách. Đổi thành trống?`)) return;
    }
    try {
        await api.put(`/api/tables/${id}/status`, { status: newStatus });
        showToast(`Đã cập nhật bàn ${number}`);
        await loadTables();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function addTable() {
    const numberInput = document.getElementById('newTableNumber');
    const number = numberInput ? parseInt(numberInput.value) : null;

    try {
        const body = number ? { number } : {};
        const result = await api.post('/api/tables', body);
        showToast(`Đã thêm Bàn ${result.number} ✅`);
        if (numberInput) numberInput.value = '';
        await loadTables();
    } catch (e) {
        showToast(e.message || 'Lỗi khi thêm bàn', 'error');
    }
}

async function deleteTable(id, number, status) {
    if (status === 'occupied') {
        showToast('Không thể xóa bàn đang có khách!', 'error');
        return;
    }
    if (!confirm(`Xóa Bàn ${number}? Hành động này không thể hoàn tác.`)) return;

    try {
        await api.delete(`/api/tables/${id}`);
        showToast(`Đã xóa Bàn ${number}`);
        await loadTables();
    } catch (e) {
        showToast(e.message || 'Lỗi khi xóa bàn', 'error');
    }
}

function logout() {
    localStorage.removeItem('admin_token');
    window.location.href = '/admin/login.html';
}
