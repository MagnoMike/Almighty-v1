import nodemailer from 'nodemailer';

// store OTPs temporarily in memory { email: { code, expiresAt, attempts } }
const otpStore = new Map();

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false
    }
});

// generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// send OTP to email
export const sendOTP = async (email) => {
    const code = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore.set(email, { code, expiresAt, attempts: 0 });

    await transporter.sendMail({
        from: `"Allmighty" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your Allmighty OTP Code',
        html: `
            <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:32px;border:1px solid #eee;border-radius:12px">
                <h2 style="color:#0679bf">Allmighty</h2>
                <p>Your one-time password is:</p>
                <h1 style="letter-spacing:8px;color:#0d1b26">${code}</h1>
                <p style="color:#888">This code expires in <strong>5 minutes</strong>.</p>
                <p style="color:#888;font-size:12px">If you did not request this, ignore this email.</p>
            </div>
        `
    }).catch(err => { console.error('Email error:', err.message); throw err; });

    return 'OTP sent successfully!';
}

// verify OTP
export const verifyOTP = (email, code) => {
    const record = otpStore.get(email);

    if (!record) return { valid: false, message: 'OTP not found. Please request a new one.' };
    if (Date.now() > record.expiresAt) {
        otpStore.delete(email);
        return { valid: false, message: 'OTP has expired. Please request a new one.' };
    }

    record.attempts += 1;

    if (record.attempts > 3) {
        otpStore.delete(email);
        return { valid: false, message: 'Too many attempts. Please request a new OTP.' };
    }

    if (record.code !== code) {
        const remaining = 3 - record.attempts;
        return { valid: false, message: `Incorrect OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` };
    }

    otpStore.delete(email); // one-time use
    return { valid: true, message: 'OTP verified!' };
}
