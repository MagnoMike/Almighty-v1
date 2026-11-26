import * as cartModel from '../models/cartModel.js';
import * as productModel from '../models/productModel.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'allmighty_secret_key';

function getUser(req) {
    const auth = req.headers.authorization;
    if (!auth) return null;
    try { return jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET); }
    catch { return null; }
}

export const getCart = async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });
    try {
        const items = await cartModel.getCart(user.id);
        res.status(200).json({ success: true, items });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

export const addItem = async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });
    const { productId, variantId } = req.body;
    try {
        const product = await productModel.getById(productId);
        if (!product) return res.status(404).json({ error: 'Product not found.' });

        // check stock
        if (variantId) {
            const variants = await productModel.getVariants(productId);
            const variant = variants.find(v => v.id === Number(variantId));
            if (!variant) return res.status(404).json({ error: 'Variant not found.' });
            if (variant.stock <= 0) return res.status(400).json({ error: 'No more stock available.' });
        } else {
            if (product.stock <= 0) return res.status(400).json({ error: 'No more stock available.' });
        }

        await cartModel.addItem(user.id, productId, variantId || null);
        const items = await cartModel.getCart(user.id);
        res.status(200).json({ success: true, items });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

export const updateQty = async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });
    const { productId, qty, variantId } = req.body;
    try {
        await cartModel.updateQty(user.id, productId, qty, variantId || null);
        const items = await cartModel.getCart(user.id);
        res.status(200).json({ success: true, items });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

export const clearCart = async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });
    try {
        await cartModel.clearCart(user.id);
        res.status(200).json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
