const express = require('express');
const router = express.Router();
const { all, get } = require('../database');

// GET today's stats
router.get('/today', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  res.json(getStatsByDate(today, today));
});

// GET stats by date range
router.get('/range', (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'Cần from và to (YYYY-MM-DD)' });
  res.json(getStatsByDate(from, to));
});

// GET revenue chart data
router.get('/chart', (req, res) => {
  const { days = 7 } = req.query;
  const data = [];
  for (let i = parseInt(days) - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayStats = get(
      `SELECT COUNT(*) as total_orders,
       COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) as revenue
       FROM orders WHERE DATE(created_at) = ?`, [dateStr]
    );
    data.push({
      date: dateStr,
      label: `${date.getDate()}/${date.getMonth() + 1}`,
      orders: dayStats?.total_orders || 0,
      revenue: dayStats?.revenue || 0
    });
  }
  res.json(data);
});

// GET top selling products
router.get('/top-products', (req, res) => {
  const { days = 7, limit = 10 } = req.query;
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - parseInt(days));
  const dateStr = dateFrom.toISOString().split('T')[0];

  const topProducts = all(
    `SELECT oi.product_name, SUM(oi.quantity) as total_quantity, SUM(oi.subtotal) as total_revenue
     FROM order_items oi JOIN orders o ON oi.order_id = o.id
     WHERE DATE(o.created_at) >= ? AND o.status != 'cancelled'
     GROUP BY oi.product_name ORDER BY total_quantity DESC LIMIT ?`, [dateStr, parseInt(limit)]
  );
  res.json(topProducts);
});

function getStatsByDate(from, to) {
  const stats = get(
    `SELECT COUNT(*) as total_orders,
     COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) as total_revenue,
     COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) as paid_revenue,
     COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
     COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_orders,
     COUNT(CASE WHEN payment_method = 'vietqr' THEN 1 END) as vietqr_orders,
     COUNT(CASE WHEN payment_method = 'cash' THEN 1 END) as cash_orders
     FROM orders WHERE DATE(created_at) BETWEEN ? AND ?`, [from, to]
  ) || {};

  return {
    ...stats,
    avg_order_value: stats.paid_orders > 0 ? Math.round(stats.paid_revenue / stats.paid_orders) : 0,
    from, to
  };
}

module.exports = router;
