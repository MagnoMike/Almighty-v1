import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const corsOptions = {
    origin: ['http://localhost:5173', 'http://localhost:5174']
}

const app = express();

app.use(express.json());
app.use(cors(corsOptions));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

try {
    const port = 3000;
    app.listen(port, () => {
        console.log(`Server running on port ${port}...`);
    });
} catch (e) {
    console.log(e);
}
