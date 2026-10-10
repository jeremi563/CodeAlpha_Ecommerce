import express from 'express';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/auth.routes.js';
import cartRoutes from './routes/cart.routes.js';
import adminOrderRoutes from './routes/admin-order.routes.js';
import orderRoutes from './routes/order.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import productRoutes from './routes/product.routes.js';

const app = express();
const frontendDirectory = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../frontend');

//middlewares
app.use(express.static(frontendDirectory));
app.use('/api/products', express.json({ limit: '8mb' }));
app.use(express.json({ limit: '100kb' }));

//routes
app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/products', productRoutes);

app.get('/api/health',(req,res) => {
    res.json({
        success:true,
        message:"E-commerce API is running"
    })
})

app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

app.use((error, req, res, next) => {
    if (error?.type === 'entity.too.large') {
        return res.status(413).json({ message: 'Request body is too large. Product requests allow up to 8MB; other API requests allow up to 100KB.' });
    }

    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        return res.status(400).json({ message: 'Request body must be valid JSON' });
    }

    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
});


export default app;