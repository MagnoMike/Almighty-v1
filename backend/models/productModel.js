import pool from "../config/db.js";

export const getAll = async (activeOnly = false) => {
    const query = activeOnly
        ? "SELECT * FROM product WHERE active = 1 ORDER BY name ASC"
        : "SELECT * FROM product ORDER BY name ASC";
    const [rows] = await pool.query(query);
    return rows;
}

export const getById = async (id) => {
    const [rows] = await pool.query("SELECT * FROM product WHERE id = ?", [id]);
    return rows[0];
}

export const getCategories = async () => {
    const [rows] = await pool.query("SELECT DISTINCT category FROM product ORDER BY category ASC");
    return rows.map(r => r.category);
}

export const insert = async (name, category, size, packaging, unit_cost, price, stock, active = 1, image = null) => {
    const [result] = await pool.query(
        "INSERT INTO product (name, category, size, packaging, unit_cost, price, stock, active, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [name, category, size, packaging, unit_cost, price, stock, active, image]
    );
    return result.insertId;
}

export const update = async (id, name, category, size, packaging, unit_cost, price, stock, active, image = null) => {
    if (image) {
        await pool.query(
            "UPDATE product SET name = ?, category = ?, size = ?, packaging = ?, unit_cost = ?, price = ?, stock = ?, active = ?, image = ? WHERE id = ?",
            [name, category, size, packaging, unit_cost, price, stock, active, image, id]
        );
    } else {
        await pool.query(
            "UPDATE product SET name = ?, category = ?, size = ?, packaging = ?, unit_cost = ?, price = ?, stock = ?, active = ? WHERE id = ?",
            [name, category, size, packaging, unit_cost, price, stock, active, id]
        );
    }
}

export const remove = async (id) => {
    await pool.query("DELETE FROM product WHERE id = ?", [id]);
}

export const stockIn = async (id, qty) => {
    await pool.query("UPDATE product SET stock = stock + ? WHERE id = ?", [qty, id]);
}

// Variants
export const getVariants = async (productId) => {
    const [rows] = await pool.query(
        "SELECT * FROM product_variant WHERE product_id = ? ORDER BY flavor ASC, size ASC",
        [productId]
    );
    return rows;
}

export const addVariant = async (productId, size, flavor, price, stock) => {
    const [result] = await pool.query(
        "INSERT INTO product_variant (product_id, size, flavor, price, stock) VALUES (?, ?, ?, ?, ?)",
        [productId, size, flavor || null, price, stock]
    );
    return result.insertId;
}

export const updateVariant = async (id, size, flavor, price, stock) => {
    await pool.query(
        "UPDATE product_variant SET size=?, flavor=?, price=?, stock=? WHERE id=?",
        [size, flavor || null, price, stock, id]
    );
}

export const deleteVariant = async (id) => {
    await pool.query("DELETE FROM product_variant WHERE id=?", [id]);
}

export const deductVariantStock = async (variantId, qty) => {
    await pool.query(
        "UPDATE product_variant SET stock = stock - ? WHERE id = ? AND stock >= ?",
        [qty, variantId, qty]
    );
}
