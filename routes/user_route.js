const express = require('express');
const router = express.Router();
const { auth, authorizeRoles } = require('../middleware/auth');
const { getDB, connectDB } = require('../config/db');
const { createUser, findUserByEmail, findUsersByStatus, generateAuthToken, saveRefreshTokenToDB, validatePassword, updateUserDetails, updateUserStatus } = require('../models/user');
const bcrypt = require('bcrypt');
const {ObjectId}=require('mongodb');
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

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const db = getDB();
    const user = await db.collection('users').findOne({ email });

    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(400).send('Invalid email or password.');
    }

    const { accessToken, refreshToken } = generateAuthToken(user);
    await saveRefreshTokenToDB(user._id, refreshToken);

    res.status(200).send({
        accessToken,
        refreshToken
    });
});

router.get('/', [auth, authorizeRoles('admin')], async (req, res) => {
    try {
        const db = getDB();
        const users = await db.collection('users').find().toArray();
        res.status(200).send(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send("An error occurred while fetching users.");
    }
});

router.get('/status', [auth, authorizeRoles('admin')], async (req, res) => {
    const { status } = req.query;
    try {
        const users = status
            ? await findUsersByStatus(status)
            : await findUsersByStatus('active');
        res.status(200).send(users);
    } catch (error) {
        console.error("Error fetching users:", error.message);
        res.status(500).send("An error occurred while fetching users.");
    }
});

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

router.patch('/update-status/:userId', [auth, authorizeRoles('admin', 'manager')], async (req, res) => {
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

router.put('/:userId', auth, authorizeRoles('admin', 'manager'), async (req, res) => {
    const { userId } = req.params;
    const userDetails = req.body;

    try {
        if (userId !== req.user._id.toString()) {
            return res.status(403).send('You are not authorized to update this user.');
        }

        const updatedUser = await updateUserDetails(userId, userDetails);

        res.status(200).send(updatedUser);
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).send(`An error occurred while updating the user: ${error.message}`);
    }
});

router.post('/logout', async (req, res) => {
    const { userId } = req.body;
    const db = getDB();
    await db.collection('users').updateOne(
        { _id: userId },
        { $unset: { refreshToken: "" } }
    );

    res.status(200).send('Logged out successfully.');
});

router.delete('/delete/:userId', auth, async (req, res) => {
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
