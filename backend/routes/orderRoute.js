import express from 'express';
import * as orderController from '../controllers/orderController.js';
import { uploadDelivery } from '../utils/upload.js';

const orderRoute = express.Router();

orderRoute.post('/place', orderController.placeOrder);
orderRoute.post('/walkin', orderController.placeWalkInOrder);
orderRoute.get('/my', orderController.getMyOrders);
orderRoute.get('/all', orderController.getAllOrders);
orderRoute.get('/rider', orderController.getRiderOrders);
orderRoute.patch('/accept/:id', orderController.acceptOrder);
orderRoute.patch('/assign/:id', orderController.assignRider);
orderRoute.patch('/cancel/:id', orderController.cancelOrder);
orderRoute.patch('/decline/:id', orderController.declineOrder);
orderRoute.patch('/pickup/:id', orderController.pickupOrder);
orderRoute.patch('/deliver/:id', uploadDelivery.single('proof'), orderController.deliverOrder);

export default orderRoute;
