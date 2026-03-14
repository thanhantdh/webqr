const express = require('express');
const router = express.Router();
const { all, get, run, generateTableToken } = require('../database');

// GET all tables
router.get('/', (req, res) => {
    const tables = all('SELECT * FROM tables_info ORDER BY number ASC');
    const result = tables.map(table => {
        if (table.current_order_id) {
            const order = get('SELECT id, status, total_amount, created_at FROM orders WHERE id = ?', [table.current_order_id]);
            return { ...table, current_order: order || null };
        }
        return { ...table, current_order: null };
    });
    res.json(result);
});

// GET validate table token for Customer App
router.get('/:number/validate', (req, res) => {
    const { number } = req.params;
    const { token } = req.query;

    if (!number || !token) {
        return res.status(403).json({ valid: false, error: 'Thiếu mã truy cập' });
    }

    const table = get('SELECT * FROM tables_info WHERE number = ?', [number]);
    if (!table) {
        return res.status(404).json({ valid: false, error: 'Bàn không tồn tại' });
    }

    if (table.qr_token !== token) {
        return res.status(403).json({ valid: false, error: 'Mã QR không hợp lệ hoặc đã hết hạn' });
    }

    res.json({ valid: true, table: number });
});

// POST create new table
router.post('/', (req, res) => {
    let { number } = req.body;

    // If no number provided, auto-assign the next available
    if (!number) {
        const maxTable = get('SELECT MAX(number) as maxNum FROM tables_info');
        number = (maxTable && maxTable.maxNum ? maxTable.maxNum : 0) + 1;
    }

    // Check duplicate
    const existing = get('SELECT * FROM tables_info WHERE number = ?', [number]);
    if (existing) return res.status(400).json({ error: `Bàn ${number} đã tồn tại` });

    // Auto-generate unique QR token
    const qrToken = generateTableToken();

    const result = run('INSERT INTO tables_info (number, status, qr_token) VALUES (?, ?, ?)', [number, 'empty', qrToken]);
    const newTable = get('SELECT * FROM tables_info WHERE id = ?', [result.lastInsertRowid]);
    if (global.broadcastOrder) global.broadcastOrder({ type: 'table_updated', table: newTable });
    res.json(newTable);
});

// PUT update table status
router.put('/:id/status', (req, res) => {
    const { status } = req.body;
    if (!['empty', 'occupied'].includes(status)) return res.status(400).json({ error: 'Trạng thái không hợp lệ' });

    const table = get('SELECT * FROM tables_info WHERE id = ?', [req.params.id]);
    if (!table) return res.status(404).json({ error: 'Không tìm thấy bàn' });

    if (status === 'empty') {
        run('UPDATE tables_info SET status = ?, current_order_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, req.params.id]);
    } else {
        run('UPDATE tables_info SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, req.params.id]);
    }

    const updated = get('SELECT * FROM tables_info WHERE id = ?', [req.params.id]);
    if (global.broadcastOrder) global.broadcastOrder({ type: 'table_updated', table: updated });
    res.json(updated);
});

// DELETE remove a table
router.delete('/:id', (req, res) => {
    const table = get('SELECT * FROM tables_info WHERE id = ?', [req.params.id]);
    if (!table) return res.status(404).json({ error: 'Không tìm thấy bàn' });

    if (table.status === 'occupied') {
        return res.status(400).json({ error: 'Không thể xóa bàn đang có khách' });
    }

    run('DELETE FROM tables_info WHERE id = ?', [req.params.id]);
    if (global.broadcastOrder) global.broadcastOrder({ type: 'table_deleted', tableId: table.id });
    res.json({ success: true, message: `Đã xóa bàn ${table.number}` });
});

module.exports = router;
