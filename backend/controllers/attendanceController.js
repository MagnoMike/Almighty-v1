import * as attendanceModel from '../models/attendanceModel.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'allmighty_secret_key';

function getUser(req) {
    const auth = req.headers.authorization;
    if (!auth) return null;
    try { return jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET); }
    catch { return null; }
}

export const getAttendance = async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });
    const date = req.query.date || new Date().toISOString().split('T')[0];
    try {
        const attendance = await attendanceModel.getByDate(date);
        const summary = await attendanceModel.getSummary(date);
        res.status(200).json({ success: true, attendance, summary });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

export const saveAttendance = async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });
    const { riderId, date, status } = req.body;
    if (!riderId || !date || !status) return res.status(400).json({ error: 'Missing fields.' });
    try {
        await attendanceModel.saveAttendance(riderId, date, status);
        res.status(200).json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

export const getUnpaid = async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });
    try {
        const unpaid = await attendanceModel.getUnpaid();
        res.status(200).json({ success: true, unpaid });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

export const markPaid = async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });
    const { ids } = req.body;
    try {
        const pool = (await import('../config/db.js')).default;
        await pool.query(`UPDATE attendance SET paid = 1, paid_at = NOW() WHERE id IN (?)`, [ids]);
        res.status(200).json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

export const markAllPaid = async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });
    const { riderId, paidBy } = req.body;
    try {
        await attendanceModel.markAllPaid(riderId, paidBy || 'Admin');
        res.status(200).json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

export const getRiderRecord = async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });
    try {
        const record = await attendanceModel.getRiderRecord(req.params.riderId);
        res.status(200).json({ success: true, ...record });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
