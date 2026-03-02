const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'database.sqlite');
const dataDir = path.join(__dirname, '..', 'data');

let db = null;

// Save database to disk
function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// Auto-save every 5 seconds
setInterval(saveDb, 5000);

async function initDatabase() {
  const SQL = await initSqlJs();

  // Ensure data directory
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    console.log('📂 Loaded existing database');
  } else {
    db = new SQL.Database();
    console.log('🆕 Created new database');
  }

  db.run('PRAGMA foreign_keys = ON');

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '🍽️',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price INTEGER NOT NULL,
      image TEXT DEFAULT '',
      sizes TEXT DEFAULT '[]',
      toppings TEXT DEFAULT '[]',
      is_available INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tables_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number INTEGER NOT NULL UNIQUE,
      status TEXT DEFAULT 'empty' CHECK(status IN ('empty', 'occupied')),
      current_order_id INTEGER DEFAULT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_number INTEGER NOT NULL,
      status TEXT DEFAULT 'new' CHECK(status IN ('new', 'preparing', 'ready', 'completed', 'paid', 'cancelled')),
      payment_method TEXT DEFAULT 'cash' CHECK(payment_method IN ('cash', 'vietqr')),
      payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid')),
      total_amount INTEGER DEFAULT 0,
      note TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      size TEXT DEFAULT '',
      toppings TEXT DEFAULT '[]',
      note TEXT DEFAULT '',
      price INTEGER NOT NULL,
      subtotal INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);

  // Seed if empty
  const result = db.exec('SELECT COUNT(*) as c FROM categories');
  const count = result[0]?.values[0][0] || 0;

  if (count === 0) {
    seedData();
  }

  saveDb();
  console.log('✅ Database ready');
  return db;
}

function seedData() {
  console.log('🌱 Seeding database...');

  const categories = [
    ['Cà Phê', '☕', 1],
    ['Trà & Trà Sữa', '🧋', 2],
    ['Nước Ép & Sinh Tố', '🥤', 3],
    ['Đá Xay', '🧊', 4],
    ['Bánh Ngọt', '🍰', 5],
    ['Ăn Vặt', '🍿', 6],
    ['Món Ăn Nhẹ', '🥪', 7],
  ];

  for (const [name, icon, sort] of categories) {
    db.run('INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)', [name, icon, sort]);
  }

  const defaultSizes = JSON.stringify([
    { name: 'Nhỏ (S)', price: 0 },
    { name: 'Vừa (M)', price: 5000 },
    { name: 'Lớn (L)', price: 10000 },
  ]);

  const drinkToppings = JSON.stringify([
    { name: 'Trân châu đen', price: 5000 },
    { name: 'Trân châu trắng', price: 5000 },
    { name: 'Thạch dừa', price: 5000 },
    { name: 'Pudding', price: 8000 },
    { name: 'Kem cheese', price: 10000 },
    { name: 'Shot espresso', price: 10000 },
  ]);

  const noSizes = '[]';
  const noToppings = '[]';

  const products = [
    [1, 'Cà Phê Đen', 'Cà phê đen truyền thống đậm đà', 25000, '', defaultSizes, noToppings, 1],
    [1, 'Cà Phê Sữa', 'Cà phê sữa đá thơm béo', 29000, '', defaultSizes, noToppings, 2],
    [1, 'Bạc Xỉu', 'Cà phê nhẹ với nhiều sữa', 32000, '', defaultSizes, noToppings, 3],
    [1, 'Cappuccino', 'Espresso với foam sữa mịn', 45000, '', defaultSizes, noToppings, 4],
    [1, 'Latte', 'Espresso với sữa nóng', 45000, '', defaultSizes, noToppings, 5],
    [1, 'Americano', 'Espresso pha loãng', 39000, '', defaultSizes, noToppings, 6],
    [1, 'Mocha', 'Cà phê chocolate béo ngậy', 49000, '', defaultSizes, noToppings, 7],
    [1, 'Caramel Macchiato', 'Latte với caramel thơm ngọt', 52000, '', defaultSizes, noToppings, 8],

    [2, 'Trà Sữa Trân Châu', 'Trà sữa truyền thống', 35000, '', defaultSizes, drinkToppings, 1],
    [2, 'Trà Sữa Matcha', 'Trà xanh Nhật Bản với sữa', 39000, '', defaultSizes, drinkToppings, 2],
    [2, 'Trà Sữa Taro', 'Trà sữa khoai môn', 39000, '', defaultSizes, drinkToppings, 3],
    [2, 'Trà Sữa Chocolate', 'Trà sữa vị socola đậm', 39000, '', defaultSizes, drinkToppings, 4],
    [2, 'Trà Đào Cam Sả', 'Trà đào tươi mát với cam sả', 35000, '', defaultSizes, drinkToppings, 5],
    [2, 'Trà Vải', 'Trà vải thanh ngọt', 35000, '', defaultSizes, drinkToppings, 6],
    [2, 'Trà Oolong Sen', 'Trà Oolong hương sen nhẹ nhàng', 32000, '', defaultSizes, drinkToppings, 7],
    [2, 'Hồng Trà Latte', 'Hồng trà Ceylon với sữa tươi', 42000, '', defaultSizes, drinkToppings, 8],

    [3, 'Nước Ép Cam', 'Cam tươi vắt nguyên chất', 35000, '', defaultSizes, noToppings, 1],
    [3, 'Nước Ép Dưa Hấu', 'Dưa hấu tươi mát', 30000, '', defaultSizes, noToppings, 2],
    [3, 'Nước Ép Ổi', 'Ổi hồng xay tươi', 30000, '', defaultSizes, noToppings, 3],
    [3, 'Sinh Tố Bơ', 'Bơ sáp béo ngậy', 39000, '', defaultSizes, noToppings, 4],
    [3, 'Sinh Tố Xoài', 'Xoài chín ngọt lịm', 35000, '', defaultSizes, noToppings, 5],
    [3, 'Sinh Tố Dâu', 'Dâu tây tươi xay nhuyễn', 39000, '', defaultSizes, noToppings, 6],
    [3, 'Sinh Tố Việt Quất', 'Việt quất bổ dưỡng', 45000, '', defaultSizes, noToppings, 7],

    [4, 'Đá Xay Chocolate', 'Chocolate đá xay béo mịn', 49000, '', defaultSizes, drinkToppings, 1],
    [4, 'Đá Xay Matcha', 'Matcha đá xay Nhật Bản', 49000, '', defaultSizes, drinkToppings, 2],
    [4, 'Đá Xay Caramel', 'Caramel đá xay thơm ngọt', 49000, '', defaultSizes, drinkToppings, 3],
    [4, 'Đá Xay Cookie', 'Cookie & cream đá xay', 52000, '', defaultSizes, drinkToppings, 4],
    [4, 'Đá Xay Dâu', 'Dâu tây đá xay tươi mát', 49000, '', defaultSizes, drinkToppings, 5],

    [5, 'Bánh Tiramisu', 'Tiramisu Ý mềm mịn', 45000, '', noSizes, noToppings, 1],
    [5, 'Bánh Phô Mai', 'Cheesecake New York', 49000, '', noSizes, noToppings, 2],
    [5, 'Bánh Chocolate Lava', 'Chocolate chảy lava nóng hổi', 52000, '', noSizes, noToppings, 3],
    [5, 'Bánh Croissant', 'Croissant bơ Pháp giòn xốp', 35000, '', noSizes, noToppings, 4],
    [5, 'Bánh Crêpe', 'Crêpe Pháp nhân kem tươi', 42000, '', noSizes, noToppings, 5],
    [5, 'Bánh Mochi', 'Mochi Nhật nhân đậu đỏ', 25000, '', noSizes, noToppings, 6],
    [5, 'Bánh Waffle', 'Waffle giòn với mật ong', 45000, '', noSizes, noToppings, 7],

    [6, 'Bánh Tráng Trộn', 'Bánh tráng trộn đủ vị', 25000, '', noSizes, noToppings, 1],
    [6, 'Bánh Tráng Nướng', 'Bánh tráng nướng Đà Lạt', 20000, '', noSizes, noToppings, 2],
    [6, 'Khoai Lắc Phô Mai', 'Khoai tây chiên lắc phô mai', 35000, '', noSizes, noToppings, 3],
    [6, 'Khoai Lang Kén', 'Khoai lang chiên giòn', 30000, '', noSizes, noToppings, 4],
    [6, 'Gà Rán Sốt Cay', 'Gà rán giòn sốt cay Hàn Quốc', 45000, '', noSizes, noToppings, 5],
    [6, 'Gà Viên Chiên', 'Gà viên chiên giòn (8 viên)', 30000, '', noSizes, noToppings, 6],
    [6, 'Xúc Xích Nướng', 'Xúc xích nướng mật ong', 20000, '', noSizes, noToppings, 7],
    [6, 'Nem Chua Rán', 'Nem chua rán giòn rụm (5 cái)', 30000, '', noSizes, noToppings, 8],
    [6, 'Tokbokki', 'Bánh gạo Hàn Quốc sốt cay', 35000, '', noSizes, noToppings, 9],
    [6, 'Takoyaki', 'Bánh bạch tuộc Nhật (6 viên)', 35000, '', noSizes, noToppings, 10],

    [7, 'Sandwich Gà', 'Sandwich gà nướng rau trộn', 39000, '', noSizes, noToppings, 1],
    [7, 'Sandwich Trứng Phô Mai', 'Sandwich trứng ốp phô mai', 35000, '', noSizes, noToppings, 2],
    [7, 'Mì Ý Bò Bằm', 'Spaghetti sốt bò bằm', 49000, '', noSizes, noToppings, 3],
    [7, 'Cơm Chiên Dương Châu', 'Cơm chiên đủ topping', 39000, '', noSizes, noToppings, 4],
    [7, 'Nui Xào Bò', 'Nui xào bò rau củ', 42000, '', noSizes, noToppings, 5],
    [7, 'Toast Phô Mai', 'Bánh mì nướng phô mai kéo sợi', 32000, '', noSizes, noToppings, 6],
  ];

  for (const p of products) {
    db.run(
      `INSERT INTO products (category_id, name, description, price, image, sizes, toppings, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, p
    );
  }

  // 30 tables
  for (let i = 1; i <= 30; i++) {
    db.run('INSERT INTO tables_info (number, status) VALUES (?, ?)', [i, 'empty']);
  }

  console.log('✅ Seed data complete: 7 categories, ' + products.length + ' products, 30 tables');
}

// Helper: run query and return all rows as objects
function all(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Helper: get single row
function get(sql, params = []) {
  const rows = all(sql, params);
  return rows[0] || null;
}

// Helper: run insert/update/delete
function run(sql, params = []) {
  db.run(sql, params);
  const lastId = db.exec('SELECT last_insert_rowid()')[0]?.values[0][0];
  const changes = db.getRowsModified();
  saveDb();
  return { lastInsertRowid: lastId, changes };
}

module.exports = { initDatabase, all, get, run, saveDb };
