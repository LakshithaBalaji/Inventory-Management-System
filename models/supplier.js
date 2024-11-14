const { getDB } = require('../config/db');
const Joi = require('joi');
const { ObjectId } = require('mongodb');

// Validation schema for updating supplier details
const validateSupplier = (data) => {
    const schema = Joi.object({
        phone: Joi.string(),
        address: Joi.string(),
        supplierDetails: Joi.object({
            organisation_name: Joi.string().optional(),
            organisation_address: Joi.string().optional(),
            product_category: Joi.string().optional()
        }).optional()
    });
    return schema.validate(data);
};

async function getSuppliers() {
    const db = getDB();
    return await db.collection('suppliers').find().toArray();
}

// Get a supplier by userId
async function getSupplierByUserId(userId) {
    const db = getDB();
    return await db.collection('suppliers').findOne({ userId: userId });
}

// Get supplier details by ID
async function getSupplierById(id) {
    const db = getDB();
    return await db.collection('suppliers').findOne({ _id: new ObjectId(id) });
}

// Update supplier details by ID
async function updateSupplier(id, updateData) {
    const db = getDB();
    const { error } = validateSupplier(updateData);
    if (error) {
        throw new Error(error.details[0].message);
    }

    // Prepare updated data
    const updatedData = {};

    if (updateData.phone) updatedData.phone = updateData.phone;
    if (updateData.address) updatedData.address = updateData.address;
    
    // Only update supplierDetails if provided in the update data
    if (updateData.supplierDetails) {
        if (updateData.supplierDetails.organisation_name) {
            updatedData['supplierDetails.organisation_name'] = updateData.supplierDetails.organisation_name;
        }
        if (updateData.supplierDetails.organisation_address) {
            updatedData['supplierDetails.organisation_address'] = updateData.supplierDetails.organisation_address;
        }
        if (updateData.supplierDetails.product_category) {
            updatedData['supplierDetails.product_category'] = updateData.supplierDetails.product_category;
        }
    }

    const result = await db.collection('suppliers').updateOne(
        { _id: new ObjectId(id) },  // Use ObjectId for the query
        { $set: updatedData }  // Set the new values
    );

    // Handle update result
    if (result.matchedCount === 0) {
        throw new Error("Supplier not found or failed to update.");
    }

    console.log("Update successful:", result);  // Log the result for verification

    // Return the updated supplier information
    const updatedSupplier = await db.collection('suppliers').findOne({ _id: new ObjectId(id) });
    return updatedSupplier;  
}

// Delete supplier by ID
async function deleteSupplier(id) {
    const db = getDB();
    const result = await db.collection('suppliers').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) throw new Error("Supplier not found or failed to delete.");
    return { message: "Supplier deleted successfully" };
}

module.exports = {
    getSuppliers,
    getSupplierById,
    updateSupplier,
    deleteSupplier,
};
