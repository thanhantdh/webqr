const express = require('express');
const router = express.Router();
const { all, get, run } = require('../database');
const { sendOrderNotification } = require('../services/telegram');
const { generateVietQRUrl } = require('../services/vietqr');

// GET all orders with items
router.get('/', (req, res) => {
    const { status, date } = req.query;
    let query = 'SELECT * FROM orders';
    const params = [];
    const conditions = [];

    if (status) {
        conditions.push('status = ?');
        params.push(status);
    }
    if (date) {
        conditions.push('DATE(created_at) = ?');
        params.push(date);
    }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY created_at DESC';

    const orders = all(query, params);
    
    // Attach items to each order
    const result = orders.map(order => {
        const items = all('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
        items.forEach(item => { item.toppings = JSON.parse(item.toppings || '[]'); });
        return { ...order, items };
    });

    res.json(result);
});

// GET order by ID with items
router.get('/:id', (req, res) => {
    if (req.params.id === 'table') return; // skip, handled by next route
    const order = get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });

    const items = all('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
    items.forEach(item => { item.toppings = JSON.parse(item.toppings || '[]'); });

    res.json({ ...order, items });
});

// GET orders by table number (active orders)
router.get('/table/:tableNumber', (req, res) => {
    const orders = all(
        `SELECT * FROM orders WHERE table_number = ? AND status NOT IN ('paid', 'cancelled') ORDER BY created_at DESC`,
        [req.params.tableNumber]
    );

    const result = orders.map(order => {
        const items = all('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
        items.forEach(item => { item.toppings = JSON.parse(item.toppings || '[]'); });
        return { ...order, items };
    });

    res.json(result);
});

// POST create new order
router.post('/', async (req, res) => {
    const { table_number, items, payment_method, note } = req.body;

    if (!table_number || !items || items.length === 0) {
        return res.status(400).json({ error: 'Thiếu thông tin bàn hoặc món' });
    }

    try {
        let totalAmount = 0;
        const processedItems = items.map(item => {
            const product = get('SELECT * FROM products WHERE id = ?', [item.product_id]);
            if (!product) throw new Error(`Sản phẩm ${item.product_id} không tồn tại`);

            let itemPrice = product.price;
            if (item.size) {
                const sizes = JSON.parse(product.sizes || '[]');
                const selectedSize = sizes.find(s => s.name === item.size);
                if (selectedSize) itemPrice += selectedSize.price;
            }

            let toppingTotal = 0;
            if (item.toppings && item.toppings.length > 0) {
                const productToppings = JSON.parse(product.toppings || '[]');
                item.toppings.forEach(tName => {
                    const topping = productToppings.find(t => t.name === tName);
                    if (topping) toppingTotal += topping.price;
                });
            }

            const subtotal = (itemPrice + toppingTotal) * (item.quantity || 1);
            totalAmount += subtotal;

            return {
                product_id: product.id,
                product_name: product.name,
                quantity: item.quantity || 1,
                size: item.size || '',
                toppings: JSON.stringify(item.toppings || []),
                note: item.note || '',
                price: itemPrice + toppingTotal,
                subtotal
            };
        });

        // Create order
        const orderResult = run(
            `INSERT INTO orders (table_number, status, payment_method, total_amount, note) VALUES (?, 'new', ?, ?, ?)`,
            [table_number, payment_method || 'cash', totalAmount, note || '']
        );
        const orderId = orderResult.lastInsertRowid;

        // Insert items
        for (const item of processedItems) {
            run(
                `INSERT INTO order_items (order_id, product_id, product_name, quantity, size, toppings, note, price, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [orderId, item.product_id, item.product_name, item.quantity,
                    item.size, item.toppings, item.note, item.price, item.subtotal]
            );
        }

        // Update table
        run('UPDATE tables_info SET status = ?, current_order_id = ?, updated_at = CURRENT_TIMESTAMP WHERE number = ?',
            ['occupied', orderId, table_number]);

        const order = get('SELECT * FROM orders WHERE id = ?', [orderId]);
        const orderItems = all('SELECT * FROM order_items WHERE order_id = ?', [orderId]);

        let vietqr = null;
        if (payment_method === 'vietqr') {
            vietqr = generateVietQRUrl(totalAmount, orderId);
        }

        // Telegram notification (async)
        sendOrderNotification(order, orderItems).catch(err => console.error('Telegram error:', err));

        // WebSocket broadcast
        if (global.broadcastOrder) {
            global.broadcastOrder({ type: 'new_order', order: { ...order, items: orderItems } });
        }

        res.status(201).json({ ...order, items: orderItems, vietqr });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST add items to existing order
router.post('/:id/add-items', async (req, res) => {
    const { items } = req.body;
    const orderId = req.params.id;

    const order = get('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    if (['paid', 'cancelled'].includes(order.status)) {
        return res.status(400).json({ error: 'Đơn hàng đã hoàn thành' });
    }

    try {
        let addedTotal = 0;
        const processedItems = items.map(item => {
            const product = get('SELECT * FROM products WHERE id = ?', [item.product_id]);
            if (!product) throw new Error(`Sản phẩm ${item.product_id} không tồn tại`);

            let itemPrice = product.price;
            if (item.size) {
                const sizes = JSON.parse(product.sizes || '[]');
                const s = sizes.find(s => s.name === item.size);
                if (s) itemPrice += s.price;
            }
            let toppingTotal = 0;
            if (item.toppings?.length) {
                const pt = JSON.parse(product.toppings || '[]');
                item.toppings.forEach(t => { const f = pt.find(x => x.name === t); if (f) toppingTotal += f.price; });
            }
            const subtotal = (itemPrice + toppingTotal) * (item.quantity || 1);
            addedTotal += subtotal;
            return {
                product_id: product.id, product_name: product.name, quantity: item.quantity || 1,
                size: item.size || '', toppings: JSON.stringify(item.toppings || []),
                note: item.note || '', price: itemPrice + toppingTotal, subtotal
            };
        });

        for (const item of processedItems) {
            run(`INSERT INTO order_items (order_id, product_id, product_name, quantity, size, toppings, note, price, subtotal)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [orderId, item.product_id, item.product_name, item.quantity, item.size, item.toppings, item.note, item.price, item.subtotal]);
        }

        run('UPDATE orders SET total_amount = total_amount + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [addedTotal, orderId]);

        const updatedOrder = get('SELECT * FROM orders WHERE id = ?', [orderId]);
        const allItems = all('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
        allItems.forEach(i => { i.toppings = JSON.parse(i.toppings || '[]'); });

        if (global.broadcastOrder) {
            global.broadcastOrder({ type: 'order_updated', order: { ...updatedOrder, items: allItems } });
        }

        res.json({ ...updatedOrder, items: allItems });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT update order status
router.put('/:id/status', (req, res) => {
    const { status } = req.body;
    const validStatuses = ['new', 'preparing', 'ready', 'completed', 'paid', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Trạng thái không hợp lệ' });

    const order = get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });

    run('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, req.params.id]);

    if (['paid', 'cancelled'].includes(status)) {
        run('UPDATE tables_info SET status = ?, current_order_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE number = ?',
            ['empty', order.table_number]);
    }
    if (status === 'paid') {
        run('UPDATE orders SET payment_status = ? WHERE id = ?', ['paid', req.params.id]);
    }

    const updatedOrder = get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    const items = all('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);

    if (global.broadcastOrder) {
        global.broadcastOrder({ type: 'order_status_changed', order: { ...updatedOrder, items } });
    }

    res.json(updatedOrder);
});

module.exports = router;
