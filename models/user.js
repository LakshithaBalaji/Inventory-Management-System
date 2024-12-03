const { getDB,COLLECTIONS} = require('../config/db');

const { ObjectId } = require('mongodb');
const Joi = require('joi');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('config');



const roles = ['admin', 'manager', 'supplier', 'customer'];

function validateUser(user) {
    const schema = Joi.object({
        name: Joi.string().min(3).max(255).required(),
        email: Joi.string().email().required(),
        password: Joi.string()
            .min(8)
            .pattern(new RegExp('^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$'))
            .required()
            .messages({
                'string.pattern.base': 'Password must contain at least one uppercase letter, one digit, and one special character.',
                'string.min': 'Password must be at least 8 characters long.',
            }),
        role: Joi.string().valid(...roles).required(),
        address: Joi.string().min(6).max(255).required(),
        status: Joi.string().valid('active', 'deactivated', 'suspended').default('active'),
        supplier_details: Joi.object({
            organisation_name: Joi.string().when('role', { is: 'supplier', then: Joi.required() }),
            organisation_address: Joi.string().when('role', { is: 'supplier', then: Joi.required() }),
            product_category: Joi.string().when('role', { is: 'supplier', then: Joi.required() }),
        }).optional(),
    });

    return schema.validate(user);
}

async function createUser(userData) {
    // Validate user data
    const { error } = validateUser(userData);
    if (error) {
        const errorMessage = error.details?.[0]?.message || 'Unknown validation error occurred';
        throw new Error(errorMessage);
    }

    // Check if the email already exists
    const existingUser = await findUserByEmail(userData.email);
    if (existingUser) {
        throw new Error('Oops!! Email is already in use. Please register with a new email');
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    const db = getDB();
    const user = {
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        address: userData.address,
        status: userData.status || 'active',
    };

    
    const result = await db.collection(COLLECTIONS.USERS).insertOne(user);
    const insertedUser = await db.collection(COLLECTIONS.USERS).findOne({ _id: result.insertedId });

  
    if (userData.role === 'supplier' && userData.supplier_details) {
        const supplierDetails = {
            userId: insertedUser._id,
            organisation_name: userData.supplier_details.organisation_name,
            product_category: userData.supplier_details.product_category,
            organisation_address: userData.supplier_details.organisation_address,
        };

        await db.collection(COLLECTIONS.SUPPLIERS).insertOne(supplierDetails);
    }

    return { message: "User Successfully Registered!" };
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
    return { token, refreshToken };
}

async function saveRefreshTokenToDB(userId, refreshToken) {
    const db = getDB();

    await db.collection(COLLECTIONS.USERS).updateOne(
        { _id: userId },
        { $set: { refresh_token: refreshToken } }
    );
}

async function findUserByEmail(email) {
    const db = getDB(); 
    const user = await db.collection(COLLECTIONS.USERS).findOne(
        { email }, 
        { projection: { password: 0, refresh_token: 0 } } 
    );
    return user;
}


async function validatePassword(storedPassword, inputPassword) {
    return await bcrypt.compare(inputPassword, storedPassword);
}

const findUsersByStatus = async (status) => {
    //const db = getDB();
    try {
        const users = await db.collection(COLLECTIONS.USERS)
            .find({ status })
            .project({ password: 0, refreshToken: 0 })
            .toArray();
        return users;
    } catch (error) {
        console.error("Error in findUsersByStatus:", error);
        throw error;
    }
};

async function updateUserStatus(userId, status) {
    const db = getDB();
    const validStatuses = ['active', 'deactivated', 'suspended'];

    if (!validStatuses.includes(status)) {
        throw new Error('Invalid status');
    }

    const result = await db.collection(COLLECTIONS.USERS).updateOne(
        { _id: new ObjectId(userId) },
        { $set: { status } }
    );

    if (result.modifiedCount === 0) {
        throw new Error('User not found or status is the same');
    }

    return result;
}

async function updateUserDetails(userId, userData) {
    const db = getDB();
    
    const updates = {};
    if (userData.name) updates.name = userData.name;
    if (userData.email) updates.email = userData.email;
    if (userData.address) updates.address = userData.address;
    if (userData.status) updates.status = userData.status;

    if (userData.role && roles.includes(userData.role)) {
        updates.role = userData.role;
    }

    if (userData.role === 'supplier') {
        if (userData.supplierDetails) {
            updates.supplier_details = {
                organisation_name: userData.supplierDetails.organisation_name,
                organisation_address: userData.supplierDetails.organisation_address,
                product_category: userData.supplierDetails.product_category
            };
        }
    }

    const result = await db.collection(COLLECTIONS.USERS).updateOne(
        { _id: new ObjectId(userId) },
        { $set: updates }
    );

    if (result.modifiedCount === 0) {
        throw new Error('User not found or no changes detected');
    }

    if (userData.role === 'supplier' && userData.supplierDetails) {
        const supplierDetails = {
            userId: new ObjectId(userId),
            organisation_name: userData.supplierDetails.organisation_name,
            organisation_address: userData.supplierDetails.organisation_address,
            product_category: userData.supplierDetails.product_category
        };
        
        await db.collection(COLLECTIONS.SUPPLIERS).updateOne(
            { userId: new ObjectId(userId) },
            { $set: supplierDetails }
        );
    }

    return { message: "User details updated successfully" };
}

async function deleteUserDetails(userId) {
    const db = getDB();

    const user = await db.collection(COLLECTIONS.USERS).findOne({ _id: new ObjectId(userId) });
    if (!user) {
        throw new Error('User not found');
    }

    const result = await db.collection(COLLECTIONS.USERS).deleteOne({ _id: new ObjectId(userId) });
    if (result.deletedCount === 0) {
        throw new Error('Failed to delete the user');
    }

    if (user.role === 'supplier') {
        await db.collection(COLLECTIONS.SUPPLIERS).deleteOne({ userId: new ObjectId(userId) });
    }

    return { message: "User successfully deleted" };
}

module.exports = {
    createUser,
    findUserByEmail,
    generateAuthToken,
    saveRefreshTokenToDB,
    findUsersByStatus,
    validatePassword,
    updateUserStatus,
    updateUserDetails,
    deleteUserDetails
};
