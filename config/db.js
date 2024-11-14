// config/db.js

const { MongoClient } = require('mongodb');
const config = require('config');

const dbURI = config.get('db');
let dbConnection = null;

async function connectDB() {
  try {
    console.log('Attempting to connect to MongoDB...');
    const client = new MongoClient(dbURI); // Remove deprecated options

    await client.connect();
    dbConnection = client.db();
    console.log('Connected to MongoDB...');
  } catch (error) {
    console.error('Failed to connect to MongoDB', error);
    process.exit(1);
  }
}

function getDB() {
  if (!dbConnection) {
    throw new Error("Database not initialized. Call connectDB first.");
  }
  return dbConnection;
}

module.exports = { connectDB, getDB };
