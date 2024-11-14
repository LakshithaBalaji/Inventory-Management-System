const { ObjectId } = require('mongodb');
const Joi = require('joi');
const { getDB } = require('../config/db');
const jwt = require('jsonwebtoken');

// Joi Schema for validating transaction 
const transactionSchema = Joi.object({
    transactionType: Joi.string().valid('purchase', 'sale').required(), 
    products: Joi.array().items(
        Joi.object({
            productId: Joi.string().hex().length(24).required(), 
            quantity: Joi.number().min(1).required(), 
            price: Joi.number().min(0).required(),
        }).required()
    ).min(1).required(), 
    customerId: Joi.string().hex().length(24).optional(),
    supplierId: Joi.string().hex().length(24).optional(), 
    status: Joi.string().valid('pending', 'approved', 'rejected', 'purchased').optional(),
    date: Joi.date().default(() => new Date()) // Sets default current date if not provided
});

// Create Sales Order
const createSalesOrder = async (salesData, customerId) => {
    const db = getDB();
    const { products } = salesData;
    let totalAmount = 0;

   
    for (const item of products) {
        const productId = new ObjectId(item.productId);

        
        const globalProduct = await db.collection('products').findOne({ _id: productId });

        if (!globalProduct) {
            throw new Error(`Product with ID: ${item.productId} not found in global inventory.`);
        }

    
        const purchasableQuantity = globalProduct.stock - globalProduct.minStockLevel;
        if (item.quantity > purchasableQuantity) {
            throw new Error(`Insufficient purchasable quantity for product ID: ${item.productId}. Max purchase quantity is ${purchasableQuantity}.`);
        }

        totalAmount += item.quantity * globalProduct.price;
    }

  
    const salesOrder = {
        customerId,
        products,
        totalAmount,
        status: 'pending',  
        date: new Date(),
    };

   
    await db.collection('transactions').insertOne({
        ...salesOrder,
        transactionType: 'sale',
    });

    return salesOrder;
};

const confirmSalesOrder = async (orderId, confirmation) => {
    const db = getDB();

    
    const order = await db.collection('transactions').findOne({ _id: new ObjectId(orderId), transactionType: 'sale', status: 'pending' });

    if (!order) {
        throw new Error('Order not found or already confirmed.');
    }

    
    if (confirmation === 'yes') {
        await db.collection('transactions').updateOne(
            { _id: new ObjectId(orderId) },
            { $set: { status: 'purchased' } }
        );

        for (const item of order.products) {
            const globalProduct = await db.collection('products').findOne({ _id: new ObjectId(item.productId) });

            if (!globalProduct) {
                throw new Error(`Product with ID: ${item.productId} not found in global inventory.`);
            }

            await db.collection('products').updateOne(
                { _id: new ObjectId(item.productId) },
                { $inc: { stock: -item.quantity } }
            );
        }

        return { message: 'Purchase confirmed and stock updated.' };
    } else {
        return { message: 'Purchase cancelled.' };
    }
};


const createPurchaseOrder = async (supplierData, supplierId) => {
    const db = getDB();
    const { products } = supplierData;
  
    const transaction = {
        supplierId: supplierId,
        status: 'pending',  
        products: [],  
        date: new Date(),
    };

  
    for (const item of products) {
        const productId = new ObjectId(item.productId);

       
        transaction.products.push({
            productId: productId,
            quantity: item.quantity,
            price: item.price || 0,  
        });
    }

   
    await db.collection('transactions').insertOne(transaction);

    return { message: 'Purchase order processed for approval.' };
};



const approveProduct = async (transactionId) => {
    const db = getDB();

    try {
       
        const transactionObjectId = new ObjectId(transactionId);

    
        const transaction = await db.collection('transactions').findOne({
            _id: transactionObjectId,
            status: 'pending',
        });

        if (!transaction) {
            console.error('Transaction not found or already processed.');
            throw new Error('Transaction not found or already processed.');
        }

        console.log('Transaction found:', transaction);

      
        for (const item of transaction.products) {
            const productIdString = item.productId.toString(); 

            const existingProduct = await db.collection('products').findOne({ _id: new ObjectId(productIdString) });

            if (existingProduct) {
                
                const updatedFields = {
                    $inc: { stock: item.quantity }, 
                };

               
                if (item.price && item.price !== existingProduct.price) {
                    updatedFields.$set = { price: item.price };
                }

                // Update the existing product
                await db.collection('products').updateOne(
                    { _id: new ObjectId(productIdString) },
                    updatedFields
                );
                console.log(`Updated stock for product ${productIdString}.`);
            } else {
               
                await db.collection('products').insertOne({
                    _id: new ObjectId(productIdString),
                    price: item.price || 0, 
                    stock: item.quantity,
                    status: 'approved',
                    supplierId: transaction.supplierId,
                    date: new Date(),
                });
                console.log(`Inserted new product ${productIdString} into products.`);
            }
        }

       
        await db.collection('transactions').updateOne(
            { _id: transactionObjectId },
            { $set: { status: 'approved' } }
        );

        return { message: 'Purchase order approved and inventory updated.' };
    } catch (err) {
        console.error('Error in approvePurchaseOrder:', err);
        throw err;
    }
};






module.exports = {
    createSalesOrder,
    confirmSalesOrder,
    createPurchaseOrder,
    approveProduct
};
