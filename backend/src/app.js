import express from 'express';
import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';

const app = express();

//middlewares
app.use(express.json());

//routes
app.use('/api/auth', authRoutes);
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
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        return res.status(400).json({ message: 'Request body must be valid JSON' });
    }

    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
});


export default app;