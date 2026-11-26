import { sendOTP, verifyOTP } from '../services/otpService.js';

export const requestOTP = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    try {
        const result = await sendOTP(email);
        res.status(200).json({ success: true, message: result });
    } catch (e) {
        res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
    }
}

export const checkOTP = (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and OTP code are required.' });

    const result = verifyOTP(email, code);
    if (!result.valid) return res.status(400).json({ error: result.message });

    res.status(200).json({ success: true, message: result.message });
}
