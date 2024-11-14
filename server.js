// server.js

const express = require('express');
const { connectDB } = require('./config/db');
const winston = require('winston');

// Set up a transport for winston
winston.add(new winston.transports.Console());

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Welcome to the Inventory Management System!');
});

connectDB().then(() => {
  app.listen(PORT, () => {
    winston.info(`Server running on port ${PORT}...`);
  });
}).catch(error => {
  winston.error('Failed to connect to the database', error);
  process.exit(1);
});
