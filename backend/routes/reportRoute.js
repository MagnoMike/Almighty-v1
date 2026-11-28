import express from 'express';
import * as reportController from '../controllers/reportController.js';

const reportRoute = express.Router();

reportRoute.get('/summary', reportController.getSummary);
reportRoute.get('/best-selling', reportController.getBestSelling);
reportRoute.get('/forecast', reportController.getForecast);
reportRoute.get('/payroll', reportController.getPayrollReport);

export default reportRoute;
