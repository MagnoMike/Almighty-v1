import * as orderModel from '../models/orderModel.js';
import * as productModel from '../models/productModel.js';
import ValidationError from '../utils/ValidationError.js';
import pool from '../config/db.js';

export const placeOrder = async (customerId, customerName, phone, address, notes, items) => {
    if (!phone || !address) throw new ValidationError('Phone and address are required.', 400);
    if (!/^(09|\+639)\d{9}$/.test(phone.replace(/[\s-]/g, ''))) throw new ValidationError('Enter a valid mobile number, e.g. 09171234567.', 400);
    if (address.trim().length < 10) throw new ValidationError('Please enter your complete delivery address.', 400);
    if (!items || items.length === 0) throw new ValidationError('Your cart is empty.', 400);

    for (const item of items) {
        const product = await productModel.getById(Number(item.id));
        if (!product) throw new ValidationError(`Product not found: ${item.name}`, 400);

        if (item.variant_id) {
            const variants = await productModel.getVariants(Number(item.id));
            const variant = variants.find(v => v.id === Number(item.variant_id));
            if (!variant) throw new ValidationError(`Variant not found for: ${item.name}`, 400);
            if (variant.stock < item.qty) throw new ValidationError(`${item.name} (${variant.size}) only has ${variant.stock} left.`, 400);
        } else {
            if (product.stock < item.qty) throw new ValidationError(`${item.name} only has ${product.stock} left.`, 400);
        }
    }

    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    const orderId = await orderModel.insert(customerId, customerName, phone.trim(), address.trim(), notes || '', total);
    await orderModel.insertItems(orderId, items.map(i => ({ ...i, id: Number(i.id) })));
    
    // deduct variant or product stock
    for (const item of items) {
        if (item.variant_id) {
            await productModel.deductVariantStock(Number(item.variant_id), item.qty);
        } else {
            await orderModel.deductStock([{ ...item, id: Number(item.id) }]);
        }
    }

    return { orderId, total };
}

export const placeWalkInOrder = async (items) => {
    if (!items || items.length === 0) throw new ValidationError('No items selected.', 400);

    for (const item of items) {
        const product = await productModel.getById(Number(item.id));
        if (!product) throw new ValidationError(`Product not found: ${item.name}`, 400);
        if (product.stock < item.qty) throw new ValidationError(`${item.name} only has ${product.stock} left.`, 400);
    }

    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    const orderId = await orderModel.insertWalkIn(total, items);
    await orderModel.deductStock(items.map(i => ({ ...i, id: Number(i.id) })));

    return { orderId, total };
}

export const getCustomerOrders = async (customerId) => {
    return await orderModel.getByCustomer(customerId);
}

export const cancelOrder = async (orderId, customerId) => {
    const order = await orderModel.getById(orderId);
    if (!order) throw new ValidationError('Order not found.', 404);
    if (order.customer_id !== customerId) throw new ValidationError('Unauthorized.', 403);
    if (order.status !== 'new') throw new ValidationError('Only new orders can be cancelled.', 400);

    for (const item of order.items) {
        await pool.query("UPDATE product SET stock = stock + ? WHERE id = ?", [item.qty, item.product_id]);
    }

    await orderModel.updateStatus(orderId, 'cancelled');
    return 'Order cancelled successfully.';
}

export const declineOrder = async (orderId) => {
    const order = await orderModel.getById(orderId);
    if (!order) throw new ValidationError('Order not found.', 404);
    if (!['new', 'preparing'].includes(order.status)) throw new ValidationError('Cannot decline this order.', 400);

    for (const item of order.items) {
        await pool.query("UPDATE product SET stock = stock + ? WHERE id = ?", [item.qty, item.product_id]);
    }

    await orderModel.updateStatus(orderId, 'cancelled');
    return 'Order declined successfully.';
}
