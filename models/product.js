const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');
const Joi = require('joi');

// Validation schema for products
const productSchema = Joi.object({
    product_name: Joi.string().required(),
    category: Joi.string().required(),
    price: Joi.number().required(),
    stock: Joi.number().required(),
    min_stock_level: Joi.number().required(),
    description: Joi.string().required(),
    warehouse_location: Joi.string().required(),
    supplied_by: Joi.string().required(), // Links to supplierId
    created_by: Joi.string().required(), // Links to user who created the product
    created_on: Joi.date().default(Date.now),
    updated_on: Joi.date().default(Date.now)
});

// Validate product data
function validateGlobalProduct(product) {
    return productSchema.validate(product);
}

// Create a global product
async function createGlobalProduct(productData, user) {
    const userRole = user?.role;

    // Validate the product data
    const { error } = validateGlobalProduct(productData);
    if (error) {
        throw new Error(error.details[0].message);
    }

    // Set created_by as the logged-in user's ID and created_on as the current date
    const createdBy = user._id || 'unknown';
    const lastUpdatedBy = createdBy;

    const product = {
        product_name: productData.product_name,
        category: productData.category,
        price: productData.price,
        stock: productData.stock,
        min_stock_level: productData.min_stock_level,
        description: productData.description,
        warehouse_location: productData.warehouse_location,
        supplied_by: productData.supplied_by,
        created_by: createdBy,
        created_on: new Date(),
        lastUpdatedBy,
        updated_on: new Date()
    };

    try {
        const db = getDB();
        const result = await db.collection('products').insertOne(product);
        return { product_id: result.insertedId, ...product };
    } catch (error) {
        throw new Error(`Database Insertion Error: ${error.message}`);
    }
}

// Get all products for specific roles
async function getProducts(role) {
    const db = getDB();
    let projection = {};

    // Customize the projection based on the user's role
    if (role === 'customer') {
        projection = {
            product_name: 1,
            category: 1,
            price: 1,
            stock: 1,
            description: 1
        };
    } else {
        projection = {
            product_name: 1,
            category: 1,
            price: 1,
            stock: 1,
            min_stock_level: 1,
            description: 1,
            warehouse_location: 1,
            lastUpdatedBy: 1,
            supplied_by: 1,
            created_by: 1,
            created_on: 1,
            updated_on: 1
        };
    }

    try {
        const products = await db.collection('products').find({}).project(projection).toArray();
        return products;
    } catch (error) {
        throw new Error('Error retrieving products');
    }
}

// Get a product by ID
async function getProductById(productId) {
    const db = getDB();
    try {
        const product = await db.collection('products').findOne({ _id: new ObjectId(productId) });
        if (!product) throw new Error('Product not found');
        return product;
    } catch (error) {
        throw new Error(`Error fetching product: ${error.message}`);
    }
}

// Get products by category
async function getProductsByCategory(category) {
    const db = getDB();
    try {
        const products = await db.collection('products').find({ category }).toArray();
        if (products.length === 0) throw new Error('No products found for the given category');
        return products;
    } catch (error) {
        throw new Error(`Error fetching products by category: ${error.message}`);
    }
}

// Get distinct categories
async function getCategories() {
    const db = getDB();
    try {
        const categories = await db.collection('products').aggregate([
            { $group: { _id: "$category" } },
            { $project: { category: "$_id", _id: 0 } }
        ]).toArray();

        return categories.map(item => item.category);
    } catch (error) {
        throw new Error('Error fetching categories: ' + error.message);
    }
}

// Update a global product by ID with role-based permission
async function updateProduct(productId, updateData, userRole) {
    // Only admin and manager can update the product
    

    const db = getDB();
    updateData.updated_on = new Date();

    try {
        const result = await db.collection('products').findOneAndUpdate(
            { _id: new ObjectId(productId) },
            { $set: updateData },
            { returnDocument: 'after' }
        );

        if (!result.value) {
            throw new Error("Product not found or failed to update.");
        }

        return result.value; // Return the updated product
    } catch (error) {
        throw new Error(`Error updating product: ${error.message}`);
    }
}

// Delete a product with role-based permission
async function deleteProduct(productId, userRole) {
    // Only admin and manager can delete the product
    if (!['admin', 'manager'].includes(userRole)) {
        throw new Error('You do not have permission to delete this product.');
    }

    const db = getDB();
    try {
        const deleteResult = await db.collection('products').deleteOne({ _id: new ObjectId(productId) });
        if (deleteResult.deletedCount === 0) {
            throw new Error('Product not found');
        }
        return true; // Return true if deleted successfully
    } catch (error) {
        throw new Error(`Error deleting product: ${error.message}`);
    }
}

// Get low stock products
async function getLowStockProducts() {
    const db = getDB();
    try {
        const lowStockProducts = await db.collection('products').find({
            $expr: { $lte: ["$stock", "$min_stock_level"] }
        }).toArray();
        return lowStockProducts;
    } catch (error) {
        throw new Error(`Error fetching low stock products: ${error.message}`);
    }
}

module.exports = {
    createGlobalProduct,
    getProductById,
    getProducts,
    getProductsByCategory,
    getCategories,
    updateProduct,
    deleteProduct,
    getLowStockProducts,
    validateGlobalProduct
};
