import * as productModel from '../models/productModel.js';

export const getProducts = async (req, res) => {
    try {
        const activeOnly = req.query.active === 'true'
        const products = await productModel.getAll(activeOnly);
        res.status(200).json({ success: true, products });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

export const getCategories = async (req, res) => {
    try {
        const categories = await productModel.getCategories();
        res.status(200).json({ success: true, categories });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

export const addProduct = async (req, res) => {
    const { name, category, size, packaging, unit_cost, price, stock, active } = req.body;
    if (!name || !category || !size || !price) return res.status(400).json({ error: 'All fields are required.' });
    try {
        const image = req.file ? `/uploads/products/${req.file.filename}` : null;
        const id = await productModel.insert(name, category, size, packaging || 'per piece', unit_cost || 0, price, stock || 0, active ?? 1, image);
        res.status(201).json({ success: true, id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

export const updateProduct = async (req, res) => {
    const { name, category, size, packaging, unit_cost, price, stock, active } = req.body;
    try {
        const image = req.file ? `/uploads/products/${req.file.filename}` : null;
        await productModel.update(req.params.id, name, category, size, packaging || 'per piece', unit_cost || 0, price, stock, active, image);
        res.status(200).json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

export const deleteProduct = async (req, res) => {
    try {
        await productModel.remove(req.params.id);
        res.status(200).json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

export const stockIn = async (req, res) => {
    const { qty } = req.body;
    if (!qty || qty <= 0) return res.status(400).json({ error: 'Invalid quantity.' });
    try {
        await productModel.stockIn(req.params.id, qty);
        res.status(200).json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

export const getVariants = async (req, res) => {
    try {
        const variants = await productModel.getVariants(req.params.id);
        res.status(200).json({ success: true, variants });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

export const addVariant = async (req, res) => {
    const { size, flavor, price, stock } = req.body;
    if (!size || !price) return res.status(400).json({ error: 'Size and price are required.' });
    try {
        const id = await productModel.addVariant(req.params.id, size, flavor, price, stock || 0);
        res.status(201).json({ success: true, id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

export const updateVariant = async (req, res) => {
    const { size, flavor, price, stock } = req.body;
    try {
        await productModel.updateVariant(req.params.variantId, size, flavor, price, stock);
        res.status(200).json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

export const deleteVariant = async (req, res) => {
    try {
        await productModel.deleteVariant(req.params.variantId);
        res.status(200).json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
