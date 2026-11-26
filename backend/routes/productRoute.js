import express from 'express';
import * as productController from '../controllers/productController.js';
import { uploadProduct } from '../utils/upload.js';

const productRoute = express.Router();

productRoute.get('/', productController.getProducts);
productRoute.get('/categories', productController.getCategories);
productRoute.post('/', uploadProduct.single('image'), productController.addProduct);
productRoute.patch('/:id', uploadProduct.single('image'), productController.updateProduct);
productRoute.delete('/:id', productController.deleteProduct);
productRoute.patch('/:id/stock-in', productController.stockIn);
productRoute.get('/:id/variants', productController.getVariants);
productRoute.post('/:id/variants', productController.addVariant);
productRoute.patch('/:id/variants/:variantId', productController.updateVariant);
productRoute.delete('/:id/variants/:variantId', productController.deleteVariant);

export default productRoute;
