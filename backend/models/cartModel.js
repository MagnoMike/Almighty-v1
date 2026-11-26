import pool from "../config/db.js";

export const getCart = async (customerId) => {
    const [rows] = await pool.query(
        `SELECT c.id, c.product_id, c.variant_id, c.qty, 
         p.name, p.price, p.size, p.stock, p.image,
         pv.size as variant_size, pv.flavor, pv.price as variant_price, pv.stock as variant_stock
         FROM cart c
         JOIN product p ON c.product_id = p.id
         LEFT JOIN product_variant pv ON c.variant_id = pv.id
         WHERE c.customer_id = ?`,
        [customerId]
    );
    return rows.map(r => ({
        ...r,
        price: r.variant_id ? r.variant_price : r.price,
        size: r.variant_id ? r.variant_size : r.size,
        stock: r.variant_id ? r.variant_stock : r.stock,
        display: r.variant_id ? `${r.variant_size}${r.flavor ? ' · ' + r.flavor : ''}` : r.size
    }));
}

export const addItem = async (customerId, productId, variantId = null, qty = 1) => {
    if (variantId) {
        await pool.query(
            `INSERT INTO cart (customer_id, product_id, variant_id, qty) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE qty = qty + ?`,
            [customerId, productId, variantId, qty, qty]
        );
    } else {
        await pool.query(
            `INSERT INTO cart (customer_id, product_id, qty) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE qty = qty + ?`,
            [customerId, productId, qty, qty]
        );
    }
}

export const updateQty = async (customerId, productId, qty, variantId = null) => {
    if (qty <= 0) {
        if (variantId) {
            await pool.query(
                "DELETE FROM cart WHERE customer_id = ? AND product_id = ? AND variant_id = ?",
                [customerId, productId, variantId]
            );
        } else {
            await pool.query(
                "DELETE FROM cart WHERE customer_id = ? AND product_id = ? AND variant_id IS NULL",
                [customerId, productId]
            );
        }
    } else {
        if (variantId) {
            await pool.query(
                "UPDATE cart SET qty = ? WHERE customer_id = ? AND product_id = ? AND variant_id = ?",
                [qty, customerId, productId, variantId]
            );
        } else {
            await pool.query(
                "UPDATE cart SET qty = ? WHERE customer_id = ? AND product_id = ? AND variant_id IS NULL",
                [qty, customerId, productId]
            );
        }
    }
}

export const clearCart = async (customerId) => {
    await pool.query("DELETE FROM cart WHERE customer_id = ?", [customerId]);
}
