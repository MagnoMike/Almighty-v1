import * as orderService from '../services/orderService.js';
import * as orderModel from '../models/orderModel.js';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { uploadDelivery } from '../utils/upload.js';

const JWT_SECRET = process.env.JWT_SECRET || 'allmighty_secret_key';

function getUser(req) {
    const auth = req.headers.authorization;
    if (!auth) return null;
    try {
        return jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    } catch {
        return null;
    }
}

export const placeOrder = async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });

    const { phone, address, notes, items, channel } = req.body;
    console.log('Items received:', JSON.stringify(items));

    try {
        const result = await orderService.placeOrder(user.id, user.name || 'Customer', phone, address, notes, items, channel || 'online');
        res.status(201).json({ success: true, ...result });
    } catch (e) {
        res.status(e.statusCode || 500).json({ error: e.message || 'Internal Server Error' });
    }
}

export const getMyOrders = async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });

    try {
        const orders = await orderService.getCustomerOrders(user.id);
        res.status(200).json({ success: true, orders });
    } catch (e) {
        res.status(500).json({ error: e.message || 'Internal Server Error' });
    }
}

export const getAllOrders = async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });
    try {
        const orders = await orderModel.getAll();
        res.status(200).json({ success: true, orders });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

export const acceptOrder = async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });
    try {
        await orderModel.accept(req.params.id);
        res.status(200).json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

export const assignRider = async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });
    const { riderId } = req.body;
    if (!riderId) return res.status(400).json({ error: 'Rider ID is required.' });
    try {
        await orderModel.assignRider(req.params.id, riderId);
        res.status(200).json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

export const cancelOrder = async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });

    try {
        const result = await orderService.cancelOrder(Number(req.params.id), user.id);
        res.status(200).json({ success: true, message: result });
    } catch (e) {
        res.status(e.statusCode || 500).json({ error: e.message || 'Internal Server Error' });
    }
}

export const placeWalkInOrder = async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });
    const { items } = req.body;
    try {
        const result = await orderService.placeWalkInOrder(items);
        res.status(201).json({ success: true, ...result });
    } catch (e) {
        res.status(e.statusCode || 500).json({ error: e.message });
    }
}

export const getRiderOrders = async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });
    try {
        const orders = await orderModel.getByRider(user.id);
        res.status(200).json({ success: true, orders });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

export const pickupOrder = async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });
    try {
        await orderModel.updateStatus(req.params.id, 'for_delivery');
        res.status(200).json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

export const deliverOrder = async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });
    try {
        const proofPhoto = req.file ? `/uploads/delivery/${req.file.filename}` : null;
        await pool.query(
            "UPDATE orders SET status = 'delivered', proof_photo = ? WHERE id = ?",
            [proofPhoto, req.params.id]
        );
        res.status(200).json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

export const declineOrder = async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });
    try {
        const result = await orderService.declineOrder(Number(req.params.id));
        res.status(200).json({ success: true, message: result });
    } catch (e) {
        res.status(e.statusCode || 500).json({ error: e.message || 'Internal Server Error' });
    }
}
