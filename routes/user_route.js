const express = require('express');
const router = express.Router();
const { auth,authorizeRoles}= require('../middleware/auth')
const { getDB,connectDB } = require('../config/db');
const { createUser, findUserByEmail, findUsersByStatus,generateAuthToken, saveRefreshTokenToDB,validatePassword, updateUserStatus } = require('../models/user');
const bcrypt = require('bcrypt');
// User Registration Route
router.post('/register', async (req, res) => {
    try {
        const newUser = await createUser(req.body);
        const token = generateAuthToken(newUser);
        res.status(201).send({ user: newUser, token }); 
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(400).json({ error: error.message });
    }
});

// User Login Route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const db = getDB();
    // Find user by email
    const user = await db.collection('users').findOne({ email });

    // Validate user credentials
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(400).send('Invalid email or password.');
    }

    // Generate Access and Refresh Tokens
    const { accessToken, refreshToken } = generateAuthToken(user);

    // Save refresh token to the database
    await saveRefreshTokenToDB(user._id, refreshToken);

    // Send both tokens in the response
    res.status(200).send({
        accessToken,
        refreshToken
    });
});
// Get All Users (regardless of status)
router.get('/',[auth, authorizeRoles('admin')], async (req, res) => {
    try {
        const db = getDB();
        const users = await db.collection('users').find().toArray();  // Get all users
        res.status(200).send(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send("An error occurred while fetching users.");
    }
});

router.get('/active',[auth, authorizeRoles('admin')], async (req, res) => {
    const { status } = req.query;  // Optional query parameter to filter by status
    try {
        const users = status ? await findUsersByStatus(status) : await findUsersByStatus('active');
        res.status(200).send(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send("An error occurred while fetching users.");
    }
});
// Get User by ID
router.get('/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await findUserByEmail(userId);
        if (!user) return res.status(404).send('User not found');
        res.status(200).send(user);
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).send("An error occurred while fetching the user.");
    }
});


// Update user status (active, deactivated, suspended)
router.patch('/update-status/:userId',[auth, authorizeRoles('admin','manager')], async (req, res) => {
    const { userId } = req.params;
    const { status } = req.body;

    try {
        await updateUserStatus(userId, status);
        res.send('User status updated successfully');
    } catch (error) {
        console.error("Error updating status:", error);
        res.status(400).send(error.message);
    }
});
//update user

router.put('/:userId',auth, async (req, res) => {
    const { userId } = req.params;
    const { name, email, address } = req.body;
    try {
        const db = getDB();
        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            { $set: { name, email, address } }
        );
        if (result.modifiedCount === 0) return res.status(404).send('User not found');
        res.status(200).send('User updated successfully');
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).send("An error occurred while updating the user.");
    }
});
// User Logout
router.post('/logout', async (req, res) => {
    const { userId } = req.body;
    const db = getDB();
    // Remove the refresh token from the database
    await db.collection('users').updateOne(
        { _id: userId },
        { $unset: { refreshToken: "" } }
    );

    res.status(200).send('Logged out successfully.');
});

// Delete User
router.delete('/:userId',auth,async (req, res) => {
    const { userId } = req.params;
    try {
        const db = getDB();
        const result = await db.collection('users').deleteOne({ _id: new ObjectId(userId) });
        if (result.deletedCount === 0) return res.status(404).send('User not found');
        res.status(200).send('User deleted successfully');
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).send("An error occurred while deleting the user.");
    }
});


module.exports = router;
