let allOrders = [];

// Khởi tạo trang
document.addEventListener('DOMContentLoaded', () => {
    // Đặt mặc định là ngày hôm nay cho bộ lọc ngày
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('filterDate').value = today;

    loadTables();
    loadHistory();
});

// Load danh sách các bàn vào Select filter
async function loadTables() {
    try {
        const tables = await api.get('/tables');
        const filterTable = document.getElementById('filterTable');
        
        tables.forEach(table => {
            const option = document.createElement('option');
            option.value = table.number;
            option.textContent = `Bàn ${table.number}`;
            filterTable.appendChild(option);
        });
    } catch (error) {
        console.error('Không tải được danh sách bàn:', error);
    }
}

// Gọi API lấy lịch sử đơn theo bộ lọc
async function loadHistory() {
    const tbody = document.getElementById('historyTbody');
    tbody.innerHTML = `<tr><td colspan="5" class="empty-history">Đang tải dữ liệu...</td></tr>`;

    const filterDate = document.getElementById('filterDate').value;
    const filterTable = document.getElementById('filterTable').value;
    
    // Ghép tham số query param status. (Nếu chọn completed thì lấy cả 'paid')
    let filterStatus = document.getElementById('filterStatus').value;
    let queryParams = [];
    if (filterDate) queryParams.push(`date=${filterDate}`);
    if (filterStatus) {
        if (filterStatus === 'completed') {
            // Sẽ filter cứng lại ở frontend vì order có 2 loại đã hoàn thành là completed hoặc paid
        } else {
            queryParams.push(`status=${filterStatus}`);
        }
    }

    const queryStr = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    try {
        const data = await api.get(`/orders${queryStr}`);
        allOrders = data;
        
        // Lọc thêm theo số bàn và status 'completed' hay 'paid' ở frontend cho chính xác
        let filteredOrders = allOrders;
        if (filterTable) {
            filteredOrders = filteredOrders.filter(o => o.table_number == filterTable);
        }
        if (filterStatus === 'completed') {
            filteredOrders = filteredOrders.filter(o => o.status === 'completed' || o.status === 'paid');
        }

        renderHistory(filteredOrders);
    } catch (error) {
        console.error('Lỗi tải lịch sử:', error);
        tbody.innerHTML = `<tr><td colspan="5" class="empty-history" style="color:red">Lỗi tải dữ liệu. Vui lòng thử lại.</td></tr>`;
    }
}

// Hiển thị ra bảng HTML
function renderHistory(orders) {
    const tbody = document.getElementById('historyTbody');
    if (!orders || orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-history">Không tìm thấy đơn hàng nào phù hợp.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    orders.forEach(order => {
        // Format Items thành dạng list bullet điểm nhấn
        let itemsHtml = '<ul class="items-list">';
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                let text = `<strong>${item.quantity}x</strong> ${item.product_name}`;
                if (item.size) text += ` (${item.size})`;
                
                let details = [];
                if (item.toppings && item.toppings.length > 0) {
                    details.push(`+ ${item.toppings.join(', ')}`);
                }
                if (item.note) {
                    details.push(`Ghi chú: ${item.note}`);
                }
                
                itemsHtml += `<li>${text}`;
                if (details.length > 0) {
                    itemsHtml += `<div class="item-topping">${details.join('<br>')}</div>`;
                }
                itemsHtml += `</li>`;
            });
        } else {
            itemsHtml += `<li><em>(Chưa có thông tin món)</em></li>`;
        }
        itemsHtml += '</ul>';

        // Ghi chú chung của cả Order
        if (order.note) {
            itemsHtml += `<div style="margin-top:8px; font-size:0.85rem; color:#d97706; padding-left:20px;">
                            <strong>Ghi chú đơn:</strong> ${order.note}
                          </div>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="font-weight:700;font-size:1.1rem;color:var(--primary)">Bàn ${order.table_number}</div>
                <div style="font-size:0.75rem;color:var(--text-light)">#${order.id}</div>
            </td>
            <td>
                <div style="font-weight:500;">${new Date(order.created_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</div>
                <div style="font-size:0.8rem;color:var(--text-secondary)">${new Date(order.created_at).toLocaleDateString('vi-VN')}</div>
            </td>
            <td>${itemsHtml}</td>
            <td style="font-weight:700;color:var(--success)">${formatMoney(order.total_amount)}</td>
            <td><span class="status-badge ${order.status}">${getStatusLabel(order.status)}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function resetFilters() {
    document.getElementById('filterDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('filterTable').value = '';
    document.getElementById('filterStatus').value = '';
    loadHistory();
}

function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

function getStatusLabel(status) {
    const labels = {
        'new': 'Mới',
        'preparing': 'Đang làm',
        'ready': 'Sẵn sàng',
        'completed': 'Hoàn thành',
        'paid': 'Đã thanh toán',
        'cancelled': 'Đã hủy'
    };
    return labels[status] || status;
}

// Xử lý nút Đăng xuất 
function logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('is_master');
    localStorage.removeItem('license_expires');
    window.location.href = '/admin/login.html';
}
