if (!localStorage.getItem('admin_token')) window.location.href = '/admin/login.html';

let categories = [];
let products = [];
let pendingImageFile = null; // File to upload

document.addEventListener('DOMContentLoaded', async () => {
    categories = await api.get('/api/categories');
    renderCategoryFilter();
    await loadProducts();
    setupImageUpload();
});

function setupImageUpload() {
    const area = document.getElementById('imageUploadArea');
    const fileInput = document.getElementById('formImageFile');

    // Click to open file picker
    area.addEventListener('click', (e) => {
        if (e.target.closest('.preview-remove')) return;
        fileInput.click();
    });

    // File selected
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleImageFile(e.target.files[0]);
        }
    });

    // Drag & Drop
    area.addEventListener('dragover', (e) => {
        e.preventDefault();
        area.classList.add('drag-over');
    });
    area.addEventListener('dragleave', () => {
        area.classList.remove('drag-over');
    });
    area.addEventListener('drop', (e) => {
        e.preventDefault();
        area.classList.remove('drag-over');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleImageFile(e.dataTransfer.files[0]);
        }
    });
}

function handleImageFile(file) {
    if (!file.type.startsWith('image/')) {
        showToast('Chỉ chấp nhận file ảnh!', 'error');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showToast('Ảnh quá lớn! Tối đa 5MB', 'error');
        return;
    }

    pendingImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        showPreview(e.target.result);
    };
    reader.readAsDataURL(file);
}

function showPreview(src) {
    document.getElementById('previewImg').src = src;
    document.getElementById('uploadPreview').style.display = 'flex';
    document.getElementById('uploadPlaceholder').style.display = 'none';
    document.getElementById('imageUploadArea').classList.add('has-image');
}

function removeImage() {
    pendingImageFile = null;
    document.getElementById('formImage').value = '';
    document.getElementById('formImageFile').value = '';
    document.getElementById('previewImg').src = '';
    document.getElementById('uploadPreview').style.display = 'none';
    document.getElementById('uploadPlaceholder').style.display = 'flex';
    document.getElementById('imageUploadArea').classList.remove('has-image');
}

async function uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch('/api/products/upload-image', {
        method: 'POST',
        body: formData,
    });
    if (!res.ok) throw new Error('Upload ảnh thất bại');
    const data = await res.json();
    return data.url;
}

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
        updateBulkBar();
        return;
    }

    container.innerHTML = `
    <table class="menu-table">
      <thead><tr>
        <th style="width:40px"><input type="checkbox" id="selectAll" onchange="toggleSelectAll(this)" title="Chọn tất cả"></th>
        <th>Sản phẩm</th><th>Danh mục</th><th>Giá</th><th>Trạng thái</th><th>Hành động</th>
      </tr></thead>
      <tbody>
        ${products.map(p => {
        const cat = categories.find(c => c.id === p.category_id);
        const emoji = getProductEmoji(p.name);
        return `<tr class="product-row">
            <td><input type="checkbox" class="product-check" value="${p.id}" onchange="updateBulkBar()"></td>
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
    updateBulkBar();
}

// Select All / Bulk Actions
function toggleSelectAll(el) {
    document.querySelectorAll('.product-check').forEach(cb => cb.checked = el.checked);
    updateBulkBar();
}

function updateBulkBar() {
    const checked = document.querySelectorAll('.product-check:checked');
    const bar = document.getElementById('bulkBar');
    if (checked.length > 0) {
        bar.style.display = 'flex';
        document.getElementById('selectedCount').textContent = checked.length;
    } else {
        bar.style.display = 'none';
    }
}

function getSelectedIds() {
    return [...document.querySelectorAll('.product-check:checked')].map(cb => parseInt(cb.value));
}

function clearSelection() {
    document.querySelectorAll('.product-check').forEach(cb => cb.checked = false);
    const selectAll = document.getElementById('selectAll');
    if (selectAll) selectAll.checked = false;
    updateBulkBar();
}

async function bulkToggle(newValue) {
    const ids = getSelectedIds();
    if (ids.length === 0) return;
    const action = newValue ? 'BẬT bán' : 'TẮT bán';
    if (!confirm(`${action} cho ${ids.length} món đã chọn?`)) return;

    for (const id of ids) {
        await api.put(`/api/products/${id}`, { is_available: newValue });
    }
    showToast(`Đã ${action} ${ids.length} món`);
    await loadProducts();
}

async function bulkDelete() {
    const ids = getSelectedIds();
    if (ids.length === 0) return;
    if (!confirm(`⚠️ Xóa ${ids.length} món đã chọn? Không thể hoàn tác!`)) return;

    for (const id of ids) {
        await api.delete(`/api/products/${id}`);
    }
    showToast(`Đã xóa ${ids.length} món`);
    await loadProducts();
}

function openAddProduct() {
    document.getElementById('modalTitle').textContent = '➕ Thêm món mới';
    document.getElementById('editId').value = '';
    document.getElementById('productForm').reset();
    removeImage();
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

    // Show existing image if available
    if (p.image) {
        document.getElementById('formImage').value = p.image;
        showPreview(p.image);
    } else {
        removeImage();
    }

    document.getElementById('productModal').classList.add('active');
}

function closeModal() {
    document.getElementById('productModal').classList.remove('active');
    pendingImageFile = null;
}

document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('editId').value;

    // Upload image first if there's a pending file
    let imageUrl = document.getElementById('formImage').value;
    if (pendingImageFile) {
        try {
            const btn = e.target.querySelector('[type="submit"]');
            btn.textContent = '⏳ Đang tải ảnh...';
            btn.disabled = true;
            imageUrl = await uploadImage(pendingImageFile);
            btn.textContent = '💾 Lưu';
            btn.disabled = false;
        } catch (err) {
            showToast('Lỗi upload ảnh: ' + err.message, 'error');
            return;
        }
    }

    const data = {
        category_id: parseInt(document.getElementById('formCategory').value),
        name: document.getElementById('formName').value,
        description: document.getElementById('formDesc').value,
        price: parseInt(document.getElementById('formPrice').value),
        image: imageUrl,
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
