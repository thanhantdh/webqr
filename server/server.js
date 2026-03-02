require('dotenv').config();

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { initDatabase } = require('./database');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// Auth
const { loginHandler } = require('./middleware/auth');
app.post('/api/login', loginHandler);

// API routes
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/tables', require('./routes/tables'));
app.use('/api/stats', require('./routes/stats'));

// VietQR endpoint
const { generateVietQRUrl } = require('./services/vietqr');
app.get('/api/vietqr', (req, res) => {
    const { amount, orderId } = req.query;
    if (!amount) return res.status(400).json({ error: 'Cần số tiền' });
    res.json(generateVietQRUrl(parseInt(amount), orderId || '0'));
});

// QR Code generation endpoint (server-side)
const QRCode = require('qrcode');
app.get('/api/qrcode', async (req, res) => {
    const { text } = req.query;
    if (!text) return res.status(400).json({ error: 'Cần text để tạo QR' });
    try {
        const dataUrl = await QRCode.toDataURL(text, {
            width: 300,
            margin: 2,
            color: { dark: '#2D1B0E', light: '#FFFFFF' }
        });
        res.json({ dataUrl });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi tạo QR code' });
    }
});

// WebSocket
const wsClients = new Set();
wss.on('connection', (ws) => {
    console.log('🔌 WebSocket connected');
    wsClients.add(ws);
    ws.on('close', () => { wsClients.delete(ws); });
    ws.on('error', () => { wsClients.delete(ws); });
});

global.broadcastOrder = function (data) {
    const message = JSON.stringify(data);
    wsClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(message);
    });
};

// Serve index.html for non-API/non-file routes
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || req.path.includes('.')) {
        return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start with async DB init
async function start() {
    await initDatabase();
    server.listen(PORT, () => {
        console.log('');
        console.log('╔══════════════════════════════════════════╗');
        console.log('║    🍜  WebQR - Đặt Đồ Ăn QR  🍜       ║');
        console.log('╠══════════════════════════════════════════╣');
        console.log(`║  🌐 Server:  http://localhost:${PORT}        ║`);
        console.log(`║  📱 Menu:    http://localhost:${PORT}/?table=1║`);
        console.log(`║  🔧 Admin:   http://localhost:${PORT}/admin/  ║`);
        console.log('╚══════════════════════════════════════════╝');
        console.log('');
    });
}

start().catch(err => {
    console.error('❌ Failed to start:', err);
    process.exit(1);
});
