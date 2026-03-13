const API_BASE = '';

const api = {
    async get(url) {
        const res = await fetch(`${API_BASE}${url}`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },
    async post(url, data) {
        const res = await fetch(`${API_BASE}${url}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },
    async put(url, data) {
        const res = await fetch(`${API_BASE}${url}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },
    async delete(url) {
        const res = await fetch(`${API_BASE}${url}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    }
};

// Toast notification
function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'} ${message}`;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 2500);
}

// Format money VND
function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

// Get table number from URL
function getTableNumber() {
    const params = new URLSearchParams(window.location.search);
    return parseInt(params.get('table')) || 1;
}

// Get menu token from URL (for private menu access)
function getMenuToken() {
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || '';
}

// Build URL with table number and token
function buildMenuUrl(page, tableNum) {
    const token = getMenuToken();
    let url = `${page}?table=${tableNum || getTableNumber()}`;
    if (token) url += `&token=${token}`;
    return url;
}

// Cart management (localStorage)
const cart = {
    KEY: 'webqr_cart',

    getAll() {
        return JSON.parse(localStorage.getItem(this.KEY) || '[]');
    },

    add(item) {
        const items = this.getAll();
        // Check for duplicate (same product, size, toppings)
        const existing = items.find(i =>
            i.product_id === item.product_id &&
            i.size === item.size &&
            JSON.stringify(i.toppings) === JSON.stringify(item.toppings)
        );
        if (existing) {
            existing.quantity += item.quantity;
            existing.note = item.note || existing.note;
        } else {
            items.push({ ...item, id: Date.now() });
        }
        localStorage.setItem(this.KEY, JSON.stringify(items));
        this.updateUI();
    },

    update(id, quantity) {
        let items = this.getAll();
        if (quantity <= 0) {
            items = items.filter(i => i.id !== id);
        } else {
            const item = items.find(i => i.id === id);
            if (item) item.quantity = quantity;
        }
        localStorage.setItem(this.KEY, JSON.stringify(items));
        this.updateUI();
    },

    remove(id) {
        const items = this.getAll().filter(i => i.id !== id);
        localStorage.setItem(this.KEY, JSON.stringify(items));
        this.updateUI();
    },

    clear() {
        localStorage.removeItem(this.KEY);
        this.updateUI();
    },

    getTotal() {
        return this.getAll().reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },

    getCount() {
        return this.getAll().reduce((sum, item) => sum + item.quantity, 0);
    },

    updateUI() {
        const count = this.getCount();
        const total = this.getTotal();
        const btn = document.querySelector('.floating-cart');
        if (btn) {
            if (count > 0) {
                btn.classList.remove('hidden');
                btn.querySelector('.cart-count').textContent = count;
                btn.querySelector('.cart-total').textContent = formatMoney(total);
            } else {
                btn.classList.add('hidden');
            }
        }
    }
};

// WebSocket connection
function connectWebSocket(onMessage) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onopen = () => console.log('🔌 WebSocket connected');
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (onMessage) onMessage(data);
    };
    ws.onclose = () => {
        console.log('🔌 WebSocket disconnected, reconnecting...');
        setTimeout(() => connectWebSocket(onMessage), 3000);
    };

    return ws;
}

// Category emoji map (fallback)
const categoryEmojis = {
    'Cà Phê': '☕',
    'Trà & Trà Sữa': '🧋',
    'Nước Ép & Sinh Tố': '🥤',
    'Đá Xay': '🧊',
    'Bánh Ngọt': '🍰',
    'Ăn Vặt': '🍿',
    'Món Ăn Nhẹ': '🥪',
};

// Product emoji map (fallback when no image)
function getProductEmoji(name) {
    const emojiMap = {
        'cà phê': '☕', 'bạc xỉu': '☕', 'cappuccino': '☕', 'latte': '☕',
        'americano': '☕', 'mocha': '☕', 'caramel': '☕', 'espresso': '☕',
        'trà sữa': '🧋', 'trà đào': '🍑', 'trà vải': '🧋', 'trà oolong': '🍵',
        'hồng trà': '🧋', 'matcha': '🍵',
        'nước ép cam': '🍊', 'nước ép dưa': '🍉', 'nước ép ổi': '🍈',
        'sinh tố bơ': '🥑', 'sinh tố xoài': '🥭', 'sinh tố dâu': '🍓',
        'sinh tố việt quất': '🫐', 'đá xay': '🧊',
        'tiramisu': '🍰', 'phô mai': '🧀', 'chocolate': '🍫', 'croissant': '🥐',
        'crêpe': '🥞', 'mochi': '🍡', 'waffle': '🧇',
        'bánh tráng': '🫓', 'khoai': '🍟', 'gà rán': '🍗', 'gà viên': '🍗',
        'xúc xích': '🌭', 'nem chua': '🥟', 'tokbokki': '🍢', 'takoyaki': '🐙',
        'sandwich': '🥪', 'mì ý': '🍝', 'cơm chiên': '🍛', 'nui': '🍝',
        'toast': '🍞',
    };

    const lowerName = name.toLowerCase();
    for (const [key, emoji] of Object.entries(emojiMap)) {
        if (lowerName.includes(key)) return emoji;
    }
    return '🍽️';
}
