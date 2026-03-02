const express = require('express');
const router = express.Router();
const { all, get, run } = require('../database');

// GET all categories
router.get('/', (req, res) => {
    const categories = all('SELECT * FROM categories ORDER BY sort_order ASC');
    res.json(categories);
});

// GET single category
router.get('/:id', (req, res) => {
    const category = get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!category) return res.status(404).json({ error: 'Không tìm thấy danh mục' });
    res.json(category);
});

// POST create category
router.post('/', (req, res) => {
    const { name, icon, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'Tên danh mục là bắt buộc' });

    const result = run(
        'INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)',
        [name, icon || '🍽️', sort_order || 0]
    );

    const category = get('SELECT * FROM categories WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(category);
});

// PUT update category
router.put('/:id', (req, res) => {
    const { name, icon, sort_order } = req.body;
    const existing = get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy danh mục' });

    run(
        'UPDATE categories SET name = ?, icon = ?, sort_order = ? WHERE id = ?',
        [name || existing.name, icon || existing.icon, sort_order ?? existing.sort_order, req.params.id]
    );

    const category = get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    res.json(category);
});

// DELETE category
router.delete('/:id', (req, res) => {
    const existing = get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy danh mục' });

    run('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ message: 'Đã xóa danh mục' });
});

module.exports = router;
