import express from 'express';
import * as cartController from '../controllers/cartController.js';

const cartRoute = express.Router();

cartRoute.get('/', cartController.getCart);
cartRoute.post('/add', cartController.addItem);
cartRoute.patch('/qty', cartController.updateQty);
cartRoute.delete('/clear', cartController.clearCart);

export default cartRoute;
