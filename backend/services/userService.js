import * as userModel from '../models/userModel.js';
import ValidationError from '../utils/ValidationError.js';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'allmighty_secret_key';

const roleRedirect = {
    admin: '/admin',
    customer: '/shop',
    delivery: '/rider',
};

const doesUserExist = async (email) => {
    const existing = await userModel.findUserByEmail(email);
    if (existing.length > 0) return { result: true, user: existing[0] };
    return { result: false, user: undefined };
}

// create account
export const createAccount = async (user) => {
    if (!user.name || !user.email || !user.password) {
        throw new ValidationError('Name, Email and Password are required!', 400);
    }
    if (!validator.isEmail(user.email)) {
        throw new ValidationError('Improper email format. Please provide a valid email address!', 400);
    }
    if (user.password.length < 8) {
        throw new ValidationError('Password must be at least 8 characters.', 400);
    }
    const existing = await doesUserExist(user.email);
    if (existing.result) {
        throw new ValidationError('An account with this email already exists!', 400);
    }
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(user.password, salt);
    const result = await userModel.insert(user.name, user.email, hashedPassword, 'customer', user.phone || '', user.address || '');
    if (!result || result <= 0) {
        throw new Error('Unable to create account. Please try again later.');
    }
    return 'Account created successfully!';
}

// login
export const login = async (user) => {
    if (!user.email || !user.password) {
        throw new ValidationError('Email and Password are required!', 400);
    }
    const existing = await doesUserExist(user.email);
    if (!existing.result) {
        throw new ValidationError('No account found with this email.', 400);
    }
    const isCorrectPassword = bcrypt.compareSync(user.password, existing.user.password);
    if (!isCorrectPassword) {
        throw new ValidationError('Incorrect password.', 400);
    }
    const token = jwt.sign(
        { id: existing.user.id, role: existing.user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
    return {
        token,
        role: existing.user.role,
        name: existing.user.name,
        redirectTo: roleRedirect[existing.user.role] || '/shop',
    };
}

// get profile
export const getProfile = async (id) => {
    const user = await userModel.findUserById(id);
    if (!user) throw new Error('User not found.');
    return user;
}

// update profile
export const updateProfile = async (id, { name, phone, address }) => {
    if (!name || !name.trim()) throw new ValidationError('Name is required.', 400);
    await userModel.updateProfile(id, { name: name.trim(), phone: phone || '', address: address || '' });
}

// update password
export const updatePassword = async (id, currentPassword, newPassword) => {
    if (!currentPassword || !newPassword) throw new ValidationError('All fields are required.', 400);
    if (newPassword.length < 8) throw new ValidationError('New password must be at least 8 characters.', 400);
    const rows = await userModel.findUserByIdWithPassword(id);
    if (!rows) throw new ValidationError('User not found.', 404);
    const isCorrect = bcrypt.compareSync(currentPassword, rows.password);
    if (!isCorrect) throw new ValidationError('Current password is incorrect.', 400);
    const salt = bcrypt.genSaltSync(10);
    const hashed = bcrypt.hashSync(newPassword, salt);
    await userModel.updatePassword(id, hashed);
}
