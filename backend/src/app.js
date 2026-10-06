import express from 'express';

const app = express();

//middlewares
app.use(express.json());

//routes

app.get('/api/health',(req,res) => {
    res.json({
        success:true,
        message:"E-commerce API is running"
    })
})


export default app;