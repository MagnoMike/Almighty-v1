import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'allmighty_secret_key';

function getUser(req) {
    const auth = req.headers.authorization;
    if (!auth) return null;
    try { return jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET); }
    catch { return null; }
}

// Sales Summary + P&L
export const getSummary = async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });

    const { from, to } = req.query;
    const start = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = to || new Date().toISOString().split('T')[0];

    try {
        // Total sales and orders
        const [sales] = await pool.query(
            `SELECT COUNT(*) as totalOrders, SUM(total) as grossSales
             FROM orders WHERE status = 'delivered' AND DATE(created_at) BETWEEN ? AND ?`,
            [start, end]
        );

        // Product costs
        const [costs] = await pool.query(
            `SELECT SUM(oi.qty * p.unit_cost) as totalCost
             FROM order_item oi
             JOIN orders o ON oi.order_id = o.id
             JOIN product p ON oi.product_id = p.id
             WHERE o.status = 'delivered' AND DATE(o.created_at) BETWEEN ? AND ?`,
            [start, end]
        );

        // Daily breakdown
        const [daily] = await pool.query(
            `SELECT DATE(created_at) as date, COUNT(*) as orders, SUM(total) as sales
             FROM orders WHERE status = 'delivered' AND DATE(created_at) BETWEEN ? AND ?
             GROUP BY DATE(created_at) ORDER BY date ASC`,
            [start, end]
        );

        const grossSales = Number(sales[0]?.grossSales || 0);
        const totalCost = Number(costs[0]?.totalCost || 0);
        const netProfit = grossSales - totalCost;

        res.status(200).json({
            success: true,
            summary: {
                totalOrders: sales[0]?.totalOrders || 0,
                grossSales,
                totalCost,
                netProfit,
                from: start,
                to: end
            },
            daily
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

// Best-selling products
export const getBestSelling = async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });

    const { from, to } = req.query;
    const start = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = to || new Date().toISOString().split('T')[0];

    try {
        const [rows] = await pool.query(
            `SELECT oi.product_id, oi.name, 
             SUM(oi.qty) as totalQty, 
             SUM(oi.qty * oi.price) as totalRevenue
             FROM order_item oi
             JOIN orders o ON oi.order_id = o.id
             WHERE o.status = 'delivered' AND DATE(o.created_at) BETWEEN ? AND ?
             GROUP BY oi.product_id, oi.name
             ORDER BY totalRevenue DESC
             LIMIT 10`,
            [start, end]
        );
        res.status(200).json({ success: true, products: rows });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

// Daily Payroll Report
export const getPayrollReport = async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });

    const { from, to } = req.query;
    const start = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = to || new Date().toISOString().split('T')[0];

    try {
        const [rows] = await pool.query(
            `SELECT a.date, u.name, a.status, a.wage, a.paid, a.paid_at
             FROM attendance a
             JOIN user u ON a.rider_id = u.id
             WHERE a.date BETWEEN ? AND ?
             ORDER BY a.date DESC, u.name ASC`,
            [start, end]
        );

        // group by date
        const grouped = rows.reduce((acc, r) => {
            if (!acc[r.date]) acc[r.date] = { date: r.date, riders: [], total: 0, paid: 0 }
            acc[r.date].riders.push(r)
            acc[r.date].total += Number(r.wage)
            if (r.paid) acc[r.date].paid += Number(r.wage)
            return acc
        }, {})

        res.status(200).json({ success: true, payroll: Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date)) });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
export const getForecast = async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });

    try {
        const [rows] = await pool.query(
            `SELECT oi.product_id, oi.name, p.stock,
             SUM(oi.qty) as totalSold,
             COUNT(DISTINCT DATE(o.created_at)) as daysActive,
             SUM(oi.qty) / GREATEST(COUNT(DISTINCT DATE(o.created_at)), 1) as avgPerDay
             FROM order_item oi
             JOIN orders o ON oi.order_id = o.id
             JOIN product p ON oi.product_id = p.id
             WHERE o.status = 'delivered' AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             GROUP BY oi.product_id, oi.name, p.stock
             ORDER BY avgPerDay DESC`
        );

        const forecast = rows.map(r => ({
            product_id: r.product_id,
            name: r.name,
            stock: r.stock,
            avgPerDay: Number(r.avgPerDay).toFixed(2),
            forecast7Days: Math.ceil(r.avgPerDay * 7),
            needsRestock: r.stock < Math.ceil(r.avgPerDay * 7)
        }));

        res.status(200).json({ success: true, forecast });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
