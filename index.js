// index.js


const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { connectDB } = require('./config/db');
const config = require('./startup/config');
const routes = require('./startup/routes');

const app = express();

async function startServer() {
  try {
    // Load configuration (e.g., environment variables)
    config();

    // Establish MongoDB connection
    await connectDB();

    // Middlewares
    app.use(helmet());
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Initialize Routes
    routes(app);

    // Start Express server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}...`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1); // Exit with failure code
  }
}

// Start the application
startServer();

module.exports = app;


































/*const express = require('express');
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
module.exports = app;*/