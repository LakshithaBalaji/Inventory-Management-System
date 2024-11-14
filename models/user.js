const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');
const Joi = require('joi');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('config');

const roles = ['admin', 'manager', 'supplier', 'customer']; // Define roles

function validateUser(user) {
    const schema = Joi.object({
        name: Joi.string().min(3),
        email: Joi.string().email(),
        password: Joi.string().min(8).pattern(new RegExp('^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{6,}$')).required(),
        role: Joi.string().valid(...roles).required(),
        address: Joi.string().min(6).required(),
        status: Joi.string().valid('active', 'deactivated', 'suspended').default('active'),
        supplier_details: Joi.object({
            organisation_name: Joi.string().when('role', { is: 'supplier', then: Joi.required() }),
            organisation_address: Joi.string().when('role', { is: 'supplier', then: Joi.required() }),
            product_category: Joi.string().when('role', { is: 'supplier', then: Joi.required() })
        }).optional(),
    });

    return schema.validate(user);
}


async function createUser(userData) {
    const { error } = validateUser(userData);
    if (error) {
        const errorMessage = error.details && error.details[0] && error.details[0].message || 'Unknown validation error occurred';
        throw new Error(errorMessage);
    }
    const existingUser = await findUserByEmail(userData.email);
    if (existingUser) {
        throw new Error('Email is already in use');
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    const db = getDB();

    const user = {
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        address: userData.address,
        status: userData.status || 'active'  // Default to 'active'
    };

    const result = await db.collection('users').insertOne(user);
    const insertedUser = await db.collection('users').findOne({ _id: result.insertedId });

    if (userData.role === 'supplier' && userData.supplierDetails) {
        const supplierDetails = {
            userId: insertedUser._id,
            organisation_name: userData.supplierDetails.organisation_name,
            product_category: userData.supplierDetails.product_category,
            organisation_address: userData.supplierDetails.organisation_address
        };

        await db.collection('suppliers').insertOne(supplierDetails);
    }

    return insertedUser;
}

function generateAuthToken(user) {
    const token = jwt.sign(
        { _id: user._id, userId: user.userId, role: user.role },
        config.get('jwtPrivateKey'),
        { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
        { _id: user._id, userId: user.userId, role: user.role },
        config.get('jwtPrivateKeyRefresh'),
        { expiresIn: '7d' }
    );
    return { token,refreshToken};
}
async function saveRefreshTokenToDB(userId, refreshToken) {
    const db = getDB();

    await db.collection('users').updateOne(
        { _id: userId },
        { $set: { refreshToken: refreshToken } }
    );
}


async function findUserByEmail(email) {
    const db = getDB();
    const user = await db.collection('users').findOne({ email });
    return user;
}

async function validatePassword(storedPassword, inputPassword) {
    return await bcrypt.compare(inputPassword, storedPassword);
}

async function findUsersByStatus(status) {
    const db = getDB();
    const users = await db.collection('users').find({ status }).toArray();
    return users;
}

async function updateUserStatus(userId, status) {
    const db = getDB();
    const validStatuses = ['active', 'deactivated', 'suspended'];

    if (!validStatuses.includes(status)) {
        throw new Error('Invalid status');
    }

    const result = await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $set: { status } }
    );

    if (result.modifiedCount === 0) {
        throw new Error('User not found or status is the same');
    }

    return result;
}

module.exports = {
    createUser,
    findUserByEmail,
    generateAuthToken,
    saveRefreshTokenToDB,
    findUsersByStatus,
    validatePassword,
    updateUserStatus
};
