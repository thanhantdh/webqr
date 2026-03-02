/**
 * VietQR Service - Generate VietQR payment links
 * Uses VietQR.net API to generate QR codes for bank transfers
 */

function generateVietQRUrl(amount, orderInfo) {
    const bankId = process.env.BANK_ID || 'TCB';
    const accountNo = process.env.BANK_ACCOUNT || '99902052007';
    const accountName = process.env.BANK_NAME || 'DANG THANH AN';

    const memo = `DH${orderInfo} ThanhToan`;

    // VietQR URL format
    const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(accountName)}`;

    return {
        qrUrl,
        bankId,
        accountNo,
        accountName,
        amount,
        memo
    };
}

module.exports = { generateVietQRUrl };
