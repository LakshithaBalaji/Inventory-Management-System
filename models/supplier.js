const { getDB,COLLECTIONS } = require('../config/db');
const Joi = require('joi');
const { ObjectId } = require('mongodb');

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
    return await db.collection(COLLECTIONS.SUPPLIERS).find().toArray();
}

async function getSupplierByUserId(userId) {
    const db = getDB();
    return await db.collection(COLLECTIONS.SUPPLIERS).findOne({ userId: userId });
}

async function getSupplierById(id) {
    const db = getDB();
    return await db.collection(COLLECTIONS.SUPPLIERS).findOne({ _id: new ObjectId(id) });
}

async function updateSupplier(id, updateData) {
    const db = getDB();
    const { error } = validateSupplier(updateData);
    if (error) {
        throw new Error(error.details[0].message);
    }

    const updatedData = {};

    if (updateData.phone) updatedData.phone = updateData.phone;
    if (updateData.address) updatedData.address = updateData.address;

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

    const result = await db.collection(COLLECTIONS.SUPPLIERS).updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
    );

    if (result.matchedCount === 0) {
        throw new Error("Supplier not found or failed to update.");
    }

    const updatedSupplier = await db.collection(COLLECTIONS.SUPPLIERS).findOne({ _id: new ObjectId(id) });
    return updatedSupplier;  
}

async function deleteSupplier(id) {
    const db = getDB();
    const result = await db.collection(COLLECTIONS.SUPPLIERS).deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) throw new Error("Supplier not found or failed to delete.");
    return { message: "Supplier deleted successfully" };
}

module.exports = {
    getSuppliers,
    getSupplierById,
    updateSupplier,
    deleteSupplier,
};
