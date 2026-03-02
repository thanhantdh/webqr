if (!localStorage.getItem('admin_token')) window.location.href = '/admin/login.html';

let categories = [];
let products = [];

document.addEventListener('DOMContentLoaded', async () => {
    categories = await api.get('/api/categories');
    renderCategoryFilter();
    await loadProducts();
});

function renderCategoryFilter() {
    const sel = document.getElementById('filterCategory');
    const formSel = document.getElementById('formCategory');
    categories.forEach(c => {
        sel.innerHTML += `<option value="${c.id}">${c.icon} ${c.name}</option>`;
        formSel.innerHTML += `<option value="${c.id}">${c.icon} ${c.name}</option>`;
    });
}

async function loadProducts() {
    const catId = document.getElementById('filterCategory').value;
    const url = catId ? `/api/products?category_id=${catId}` : '/api/products';
    products = await api.get(url);
    renderProducts();
}

function renderProducts() {
    const container = document.getElementById('menuContainer');
    document.getElementById('productCount').textContent = `${products.length} sản phẩm`;

    if (products.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-light)">Chưa có sản phẩm nào</p>';
        return;
    }

    container.innerHTML = `
    <table class="menu-table">
      <thead><tr>
        <th>Sản phẩm</th><th>Danh mục</th><th>Giá</th><th>Trạng thái</th><th>Hành động</th>
      </tr></thead>
      <tbody>
        ${products.map(p => {
        const cat = categories.find(c => c.id === p.category_id);
        const emoji = getProductEmoji(p.name);
        return `<tr>
            <td><div class="product-cell">
              <div class="product-thumb">${p.image ? `<img src="${p.image}" style="width:100%;height:100%;object-fit:cover;border-radius:6px">` : emoji}</div>
              <div><strong>${p.name}</strong><br><small style="color:var(--text-light)">${p.description || ''}</small></div>
            </div></td>
            <td>${cat ? `${cat.icon} ${cat.name}` : '-'}</td>
            <td><strong>${formatMoney(p.price)}</strong></td>
            <td>
              <div class="toggle-switch ${p.is_available ? 'active' : ''}" 
                onclick="toggleAvailable(${p.id}, ${p.is_available ? 0 : 1})"></div>
            </td>
            <td><div class="actions-cell">
              <button onclick="openEditProduct(${p.id})">✏️</button>
              <button onclick="deleteProduct(${p.id},'${p.name.replace(/'/g, "\\'")}')">🗑️</button>
            </div></td>
          </tr>`;
    }).join('')}
      </tbody>
    </table>
  `;
}

function openAddProduct() {
    document.getElementById('modalTitle').textContent = '➕ Thêm món mới';
    document.getElementById('editId').value = '';
    document.getElementById('productForm').reset();
    document.getElementById('productModal').classList.add('active');
}

function openEditProduct(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    document.getElementById('modalTitle').textContent = '✏️ Sửa món';
    document.getElementById('editId').value = id;
    document.getElementById('formCategory').value = p.category_id;
    document.getElementById('formName').value = p.name;
    document.getElementById('formDesc').value = p.description || '';
    document.getElementById('formPrice').value = p.price;
    document.getElementById('formImage').value = p.image || '';
    document.getElementById('productModal').classList.add('active');
}

function closeModal() {
    document.getElementById('productModal').classList.remove('active');
}

document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('editId').value;
    const data = {
        category_id: parseInt(document.getElementById('formCategory').value),
        name: document.getElementById('formName').value,
        description: document.getElementById('formDesc').value,
        price: parseInt(document.getElementById('formPrice').value),
        image: document.getElementById('formImage').value,
    };

    try {
        if (editId) {
            await api.put(`/api/products/${editId}`, data);
            showToast('Đã cập nhật!');
        } else {
            await api.post('/api/products', data);
            showToast('Đã thêm món mới!');
        }
        closeModal();
        await loadProducts();
    } catch (err) {
        alert('Lỗi: ' + err.message);
    }
});

async function toggleAvailable(id, newValue) {
    await api.put(`/api/products/${id}`, { is_available: newValue });
    await loadProducts();
}

async function deleteProduct(id, name) {
    if (!confirm(`Xóa "${name}"?`)) return;
    await api.delete(`/api/products/${id}`);
    showToast('Đã xóa!');
    await loadProducts();
}

function logout() {
    localStorage.removeItem('admin_token');
    window.location.href = '/admin/login.html';
}
