/**
 * Telegram Bot Service - Send order notifications
 */

const fetch = require('node-fetch');

async function sendOrderNotification(order, items) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || token === 'YOUR_BOT_TOKEN_HERE' || !chatId || chatId === 'YOUR_CHAT_ID_HERE') {
        console.log('⚠️ Telegram chưa cấu hình, bỏ qua thông báo');
        return false;
    }

    const itemsList = items
        .map(
            (item) =>
                `  • ${item.product_name}${item.size ? ` (${item.size})` : ''} x${item.quantity} - ${formatMoney(item.subtotal)}`
        )
        .join('\n');

    const paymentMethod = order.payment_method === 'vietqr' ? '💳 VietQR' : '💵 Tại quầy';

    const message = `🔔 *ĐƠN HÀNG MỚI #${order.id}*

🪑 Bàn: *${order.table_number}*
💰 Tổng: *${formatMoney(order.total_amount)}*
${paymentMethod}

📋 *Chi tiết:*
${itemsList}
${order.note ? `\n📝 Ghi chú: ${order.note}` : ''}
⏰ ${new Date().toLocaleString('vi-VN')}`;

    try {
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown',
            }),
        });

        const data = await response.json();
        if (data.ok) {
            console.log('✅ Telegram notification sent for order #' + order.id);
            return true;
        } else {
            console.error('❌ Telegram error:', data.description);
            return false;
        }
    } catch (error) {
        console.error('❌ Telegram send failed:', error.message);
        return false;
    }
}

function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

module.exports = { sendOrderNotification };
