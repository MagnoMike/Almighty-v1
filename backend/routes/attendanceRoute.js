import express from 'express';
import * as attendanceController from '../controllers/attendanceController.js';

const attendanceRoute = express.Router();

attendanceRoute.get('/', attendanceController.getAttendance);
attendanceRoute.post('/', attendanceController.saveAttendance);
attendanceRoute.get('/unpaid', attendanceController.getUnpaid);
attendanceRoute.post('/pay', attendanceController.markPaid);
attendanceRoute.post('/pay-all', attendanceController.markAllPaid);
attendanceRoute.get('/rider/:riderId', attendanceController.getRiderRecord);

export default attendanceRoute;
