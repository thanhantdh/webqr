/**
 * Authentication middleware
 * Validates simple admin password from .env
 */

function validateKey(password) {
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (password === adminPassword) {
        // Cố định ngày hết hạn để báo cho người dùng biết (có thể chỉnh sửa tại đây)
        // Ví dụ: Gia hạn 1 năm
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        
        return { 
            valid: true, 
            customer_name: 'Quản trị viên', 
            expires_at: expiresAt.toISOString().split('T')[0]
        };
    }

    return { valid: false, error: 'Mật khẩu không chính xác' };
}

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Cần đăng nhập' });
    }

    const token = authHeader.split(' ')[1];

    let password;
    try {
        password = Buffer.from(token, 'base64').toString('utf8');
    } catch {
        return res.status(403).json({ error: 'Token không hợp lệ' });
    }

    const result = validateKey(password);
    if (!result.valid) {
        return res.status(403).json({ error: result.error });
    }

    req.licenseInfo = result;
    next();
}

// Login endpoint handler
function loginHandler(req, res) {
    const { password } = req.body;

    const result = validateKey(password);

    if (result.valid) {
        const token = Buffer.from(password).toString('base64');
        res.json({
            success: true,
            token,
            customer_name: result.customer_name,
            expires_at: result.expires_at
        });
    } else {
        res.status(401).json({ error: result.error });
    }
}

module.exports = { authMiddleware, loginHandler };
