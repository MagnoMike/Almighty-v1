import * as productModel from '../models/productModel.js';

export const getProducts = async (activeOnly = true) => {
    return await productModel.getAll(activeOnly);
}

export const getCategories = async () => {
    return await productModel.getCategories();
}
