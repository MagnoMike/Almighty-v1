import express from 'express';
import { requestOTP, checkOTP } from '../controllers/otpController.js';

const otpRoute = express.Router();

otpRoute.post('/send', requestOTP);
otpRoute.post('/verify', checkOTP);

export default otpRoute;
