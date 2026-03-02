const express = require('express');
const router = express.Router();
const { all, get, run } = require('../database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer config for image upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', '..', 'public', 'images', 'products');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `product_${Date.now()}${ext}`);
    },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET all products (optionally filter by category)
router.get('/', (req, res) => {
    const { category_id } = req.query;
    let products;
    if (category_id) {
        products = all('SELECT * FROM products WHERE category_id = ? ORDER BY sort_order ASC', [category_id]);
    } else {
        products = all('SELECT * FROM products ORDER BY category_id, sort_order ASC');
    }
    products = products.map(p => ({
        ...p,
        sizes: JSON.parse(p.sizes || '[]'),
        toppings: JSON.parse(p.toppings || '[]'),
    }));
    res.json(products);
});

// GET single product
router.get('/:id', (req, res) => {
    const product = get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    product.sizes = JSON.parse(product.sizes || '[]');
    product.toppings = JSON.parse(product.toppings || '[]');
    res.json(product);
});

// POST create product
router.post('/', (req, res) => {
    const { category_id, name, description, price, image, sizes, toppings, sort_order } = req.body;
    if (!name || !price || !category_id) {
        return res.status(400).json({ error: 'Tên, giá và danh mục là bắt buộc' });
    }

    const result = run(
        `INSERT INTO products (category_id, name, description, price, image, sizes, toppings, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [category_id, name, description || '', price, image || '',
            JSON.stringify(sizes || []), JSON.stringify(toppings || []), sort_order || 0]
    );

    const product = get('SELECT * FROM products WHERE id = ?', [result.lastInsertRowid]);
    product.sizes = JSON.parse(product.sizes || '[]');
    product.toppings = JSON.parse(product.toppings || '[]');
    res.status(201).json(product);
});

// PUT update product
router.put('/:id', (req, res) => {
    const existing = get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });

    const { category_id, name, description, price, image, sizes, toppings, is_available, sort_order } = req.body;

    run(
        `UPDATE products SET category_id=?, name=?, description=?, price=?, image=?, sizes=?, toppings=?, is_available=?, sort_order=? WHERE id=?`,
        [
            category_id ?? existing.category_id,
            name || existing.name,
            description ?? existing.description,
            price ?? existing.price,
            image ?? existing.image,
            sizes ? JSON.stringify(sizes) : existing.sizes,
            toppings ? JSON.stringify(toppings) : existing.toppings,
            is_available ?? existing.is_available,
            sort_order ?? existing.sort_order,
            req.params.id
        ]
    );

    const product = get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    product.sizes = JSON.parse(product.sizes || '[]');
    product.toppings = JSON.parse(product.toppings || '[]');
    res.json(product);
});

// DELETE product
router.delete('/:id', (req, res) => {
    const existing = get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });

    run('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Đã xóa sản phẩm' });
});

// POST upload image
router.post('/upload-image', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Không có file ảnh' });
    const imageUrl = `/images/products/${req.file.filename}`;
    res.json({ url: imageUrl });
});

module.exports = router;
