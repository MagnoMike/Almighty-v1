import multer from 'multer';
import path from 'path';

const productStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/products/'),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    }
});

const deliveryStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/delivery/'),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, and WEBP images are allowed.'), false);
};

export const uploadProduct = multer({ storage: productStorage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
export const uploadDelivery = multer({ storage: deliveryStorage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

export default uploadProduct;
