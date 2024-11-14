// index.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./startup/config'); 
const { connectDB } = require('./config/db');
const routes=require('./startup/routes');
const app = express();

config(); 
connectDB(); 
app.use(express.json());  
app.use(express.urlencoded({ extended: true }));  
routes(app);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}...`));
module.exports = app;