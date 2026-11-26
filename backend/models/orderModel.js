import pool from "../config/db.js";

export const insert = async (customerId, customerName, phone, address, notes, total, payment = 'COD') => {
    const [result] = await pool.query(
        "INSERT INTO orders (customer_id, customer_name, phone, address, notes, total, payment) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [customerId, customerName, phone, address, notes, total, payment]
    );
    return result.insertId;
}

export const insertWalkIn = async (total, items) => {
    const [result] = await pool.query(
        "INSERT INTO orders (customer_id, customer_name, phone, address, notes, total, payment, status, channel) VALUES (NULL, 'Walk-in Customer', 'N/A', 'Walk-in', '', ?, 'Cash', 'delivered', 'walk-in')",
        [total]
    );
    const orderId = result.insertId;
    for (const item of items) {
        await pool.query(
            "INSERT INTO order_item (order_id, product_id, name, price, qty) VALUES (?, ?, ?, ?, ?)",
            [orderId, Number(item.id), item.name, item.price, item.qty]
        );
    }
    return orderId;
}

export const insertItems = async (orderId, items) => {
    for (const item of items) {
        await pool.query(
            "INSERT INTO order_item (order_id, product_id, name, price, qty) VALUES (?, ?, ?, ?, ?)",
            [orderId, item.id, item.name, item.price, item.qty]
        );
    }
}

export const deductStock = async (items) => {
    for (const item of items) {
        await pool.query(
            "UPDATE product SET stock = stock - ? WHERE id = ? AND stock >= ?",
            [item.qty, item.id, item.qty]
        );
    }
}

export const getByCustomer = async (customerId) => {
    const [orders] = await pool.query(
        "SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC",
        [customerId]
    );
    for (const order of orders) {
        const [items] = await pool.query("SELECT * FROM order_item WHERE order_id = ?", [order.id]);
        order.items = items;
    }
    return orders;
}

export const getById = async (id) => {
    const [orders] = await pool.query("SELECT * FROM orders WHERE id = ?", [id]);
    if (!orders[0]) return null;
    const [items] = await pool.query("SELECT * FROM order_item WHERE order_id = ?", [id]);
    orders[0].items = items;
    return orders[0];
}

export const getAll = async () => {
    const [orders] = await pool.query("SELECT * FROM orders ORDER BY created_at DESC");
    for (const order of orders) {
        const [items] = await pool.query("SELECT * FROM order_item WHERE order_id = ?", [order.id]);
        order.items = items;
    }
    return orders;
}

export const accept = async (id) => {
    await pool.query("UPDATE orders SET status = 'preparing' WHERE id = ? AND status = 'new'", [id]);
}

export const assignRider = async (id, riderId) => {
    await pool.query("UPDATE orders SET status = 'for_delivery', rider_id = ? WHERE id = ?", [riderId, id]);
}

export const getByRider = async (riderId) => {
    const [orders] = await pool.query(
        "SELECT * FROM orders WHERE rider_id = ? ORDER BY created_at DESC",
        [riderId]
    );
    for (const order of orders) {
        const [items] = await pool.query("SELECT * FROM order_item WHERE order_id = ?", [order.id]);
        order.items = items;
    }
    return orders;
}

export const updateStatus = async (id, status) => {
    await pool.query("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
}
