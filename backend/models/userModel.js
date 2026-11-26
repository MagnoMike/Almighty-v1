import pool from "../config/db.js";

// insert new user
export const insert = async (name, email, password, role = 'customer', phone = '', address = '') => {
    const [result] = await pool.query(
        "INSERT INTO user (name, email, password, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)",
        [name, email, password, role, phone, address]
    );
    return result.insertId;
}

// find user by email
export const findUserByEmail = async (email) => {
    const [rows] = await pool.query(
        "SELECT * FROM user WHERE email = ?",
        [email]
    );
    return rows;
}

// find user by id
export const findUserById = async (id) => {
    const [rows] = await pool.query(
        "SELECT id, name, email, role, phone, address FROM user WHERE id = ?",
        [id]
    );
    return rows[0];
}

// find user by id with password
export const findUserByIdWithPassword = async (id) => {
    const [rows] = await pool.query(
        "SELECT id, name, email, role, phone, address, password FROM user WHERE id = ?",
        [id]
    );
    return rows[0];
}

// update profile
export const updateProfile = async (id, { name, phone, address }) => {
    await pool.query(
        "UPDATE user SET name = ?, phone = ?, address = ? WHERE id = ?",
        [name, phone, address, id]
    );
}

// update password
export const updatePassword = async (id, hashedPassword) => {
    await pool.query(
        "UPDATE user SET password = ? WHERE id = ?",
        [hashedPassword, id]
    );
}
