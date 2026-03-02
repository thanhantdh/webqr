/**
 * Simple admin authentication middleware
 * Uses a shared password from .env
 */

function authMiddleware(req, res, next) {
    // Allow GET requests to public APIs (categories, products)
    // Only protect admin-specific endpoints
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Cần đăng nhập' });
    }

    const token = authHeader.split(' ')[1];
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    // Simple token = base64(password)
    const expectedToken = Buffer.from(adminPassword).toString('base64');

    if (token !== expectedToken) {
        return res.status(403).json({ error: 'Mật khẩu không đúng' });
    }

    next();
}

// Login endpoint handler
function loginHandler(req, res) {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (password === adminPassword) {
        const token = Buffer.from(adminPassword).toString('base64');
        res.json({ success: true, token });
    } else {
        res.status(401).json({ error: 'Mật khẩu không đúng' });
    }
}

module.exports = { authMiddleware, loginHandler };
