import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import app from './app.js';



const PORT = process.env.PORT || 8000;

app.listen(PORT,() => {
    console.log(`The app is listening on port ${PORT}`)
})