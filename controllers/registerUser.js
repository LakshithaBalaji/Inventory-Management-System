//controllers/registerUser
const { getDB } = require('../config/db'); // Assuming getDB is set up for MongoDB connection
const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const config = require('config');

// Function to register a new user
async function registerUser(req, res) {
    const { name, email, password, role } = req.body;

    try {
        const db = getDB();

        // Check if user already exists
        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already registered with this email.' });
        }

        // Hash the password for security
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user data
        const newUser = {
            _id: new ObjectId(),
            name,
            email,
            password: hashedPassword,
            role
        };
        await db.collection('users').insertOne(newUser);
        if (role === 'supplier') {
            const supplierData = {
                userId: newUser._id,
                name,
                contactDetails: supplierDetails // Assuming supplierDetails is passed as an object
            };
        // Insert the new user into the users collection
        await db.collection('suppliers').insertOne(supplierData);
        }
        const token = jwt.sign(
            { _id: newUser._id, role: newUser.role },
            config.get('jwtPrivateKey'), 
            { expiresIn: '1h' }
        );


        // Return a response (excluding the password for security)
        res.status(201).json({ message: 'User registered successfully', user: { name, userId, email, role } });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ message: 'An error occurred while registering the user' });
    }
}

module.exports = { registerUser };
