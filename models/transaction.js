const { ObjectId } = require('mongodb');
const Joi = require('joi');
const { getDB,COLLECTIONS } = require('../config/db');

const transactionSchema = Joi.object({
    transaction_type: Joi.string().valid('purchase', 'sale').required(),
    products: Joi.array().items(
        Joi.object({
            product_id: Joi.string().hex().length(24).required(),
            quantity: Joi.number().min(1).required(),
            stock: Joi.number().min(1).required(),
            price: Joi.number().min(0).required(),
        }).required()
    ).min(1).required(),
    status: Joi.string().valid('pending', 'approved', 'rejected', 'purchased').optional(),
    date: Joi.date().default(() => new Date())
});


async function createSalesOrder(products, customerId) {
    const db = getDB();
    const transaction = {
        customer_id: ObjectId.createFromHexString(customerId),
        products: [],
        totalAmount: 0,
        status: 'pending',
        date: new Date(),
    };

    let totalAmount = 0;

    // Convert each product_id to ObjectId and calculate the total amount
    for (let product of products) {
        const productId = ObjectId.createFromHexString(product.product_id); // Convert string to ObjectId
        const productDetails = await db.collection(COLLECTIONS.PRODUCTS).findOne({ _id: productId });

        if (!productDetails) {
            throw new Error(`Product with ID ${product.product_id} not found.`);
        }

        totalAmount += productDetails.price * product.quantity;

        // Store the product with ObjectId in the products array
        transaction.products.push({
            product_id: productId, // Store the product_id as ObjectId
            quantity: product.quantity,
          
            price: productDetails.price,
        });
    }

    transaction.totalAmount = totalAmount;

    try {
        const result = await db.collection(COLLECTIONS.TRANSACTIONS).insertOne(transaction);
        return {
            order_id: result.insertedId,
            products: transaction.products,
            totalAmount: totalAmount,
            status: transaction.status,
            date: transaction.date,
            message: "Sales order created successfully and is pending.",
        };
    } catch (error) {
        throw new Error(`Failed to create sales order: ${error.message}`);
    }
}

async function confirmSalesOrder(orderId, confirmation, req) {
    const db = getDB();
    const customerId = req.user._id;

    try {
        // Validate `orderId` is a valid ObjectId
        if (!ObjectId.isValid(orderId)) {
            throw new Error('Invalid orderId format. It must be a 24-character hexadecimal string.');
        }

        // Fetch the order with a pending status
        const order = await db.collection(COLLECTIONS.TRANSACTIONS).findOne({
            _id: ObjectId.createFromHexString(orderId),
            status: 'pending',
        });

        if (!order) {
            throw new Error('Order not found or already confirmed.');
        }

        // Check if the order belongs to the current customer
        if (order.customer_id.toString() !== customerId.toString()) {
            throw new Error('This order does not belong to the current customer.');
        }

        // Handle confirmation logic
        if (confirmation === 'yes') {
            // Update order status to 'purchased'
            await db.collection(COLLECTIONS.TRANSACTIONS).updateOne(
                { _id: ObjectId.createFromHexString(orderId) },
                { $set: { status: 'purchased' } }
            );

            for (const item of order.products) {
                let productId = item.product_id;
                if (!(productId instanceof ObjectId)) {
                    productId = new ObjectId(productId); // Convert it to ObjectId if it's a string
                }
            
                // Validate productId
                if (!ObjectId.isValid(productId)) {
                    throw new Error(`Invalid product ID format for product ${productId}`);
                }

                // Fetch the product from the inventory
                const globalProduct = await db.collection(COLLECTIONS.PRODUCTS).findOne({ _id: productId });
                if (!globalProduct) {
                    throw new Error(`Product with ID: ${productId} not found in global inventory.`);
                }

                // Check stock availability
                if (globalProduct.stock < item.quantity) {
                    throw new Error(`Not enough stock for product ID: ${productId}`);
                }

                // Log before updating the stock
                console.log(`Updating stock for product ID: ${productId}, current stock: ${globalProduct.stock}, quantity to deduct: ${item.quantity}`);

                // Update product stock
                const result = await db.collection(COLLECTIONS.PRODUCTS).updateOne(
                    { _id: productId },
                    { $inc: { stock: -item.quantity } }
                );

                // Log result of stock update
                console.log(`Stock updated for product ID: ${productId}, result: ${result.modifiedCount} document(s) modified`);
            }

            return { message: 'Purchase confirmed and stock updated.' };
        } else if (confirmation === 'no') {
            return { message: 'Purchase cancelled.' };
        } else {
            throw new Error('Invalid confirmation value. Use "yes" or "no".');
        }
    } catch (error) {
        console.error(`Error confirming purchase: ${error.message}`);
        throw new Error(`Failed to confirm purchase: ${error.message}`);
    }
}



function isValidObjectId(id) {
    return ObjectId.isValid(id) && id.length === 24;
}

async function createPurchaseOrder(supplierData, supplierId) {
    const db = getDB();
    const { products } = supplierData;

    const validSupplierId = ObjectId.createFromHexString(supplierId);

    const transaction = {
        supplier_id: validSupplierId,
        status: 'pending',
        products: [],
        date: new Date(),
    };

    for (const item of products) {
        let product_id;

        if (item.product_id) {
            product_id = ObjectId.createFromHexString(item.product_id);
        } else {
            if (!item.product_name || !item.category || !item.price || !item.stock || !item.description) {
                throw new Error('For new products, product_name, category, price, stock, and description are required.');
            }

            const placeholderProduct = {
                product_name: item.product_name,
                category: item.category,
                price: item.price,
                stock: item.stock,
                description: item.description,
                supplier_id: validSupplierId,
                status: 'not available',
                created_by: validSupplierId,
                created_on: new Date(),
                updated_on: new Date(),
                last_updated_by:validSupplierId,
            };

            const productInsertResult = await db.collection(COLLECTIONS.PRODUCTS).insertOne(placeholderProduct);

            product_id = productInsertResult.insertedId;
        }

        transaction.products.push({
            product_id: product_id,
            stock: item.stock,
            price: item.price,
        });
    }

    await db.collection(COLLECTIONS.TRANSACTIONS).insertOne(transaction);
    return { message: 'Purchase order processed for approval.' };
}

async function approveProduct(transactionId, adminId, minStockLevel, confirmation) {
    const db = getDB();
    const transactionObjectId = ObjectId.createFromHexString(transactionId);
    
    const transaction = await db.collection(COLLECTIONS.TRANSACTIONS).findOne({
        _id: transactionObjectId,
        status: 'pending',
    });

    if (!transaction) {
        throw new Error('Transaction not found or already processed.');
    }

    const adminIdOnly = adminId._id || adminId;

    if (confirmation === 'approve') {
        for (const item of transaction.products) {
            const existingProduct = await db.collection(COLLECTIONS.PRODUCTS).findOne({ _id: item.product_id });

            if (existingProduct) {
                const updatedFields = {
                    $inc: { stock: item.stock },
                    $set: {
                        approved_on: new Date(),
                        approved_by: ObjectId.createFromHexString(adminIdOnly),
                        min_stock_level: minStockLevel,
                    }
                };
                
                if (item.price && item.price !== existingProduct.price) {
                    updatedFields.$set.price = item.price;
                }

                await db.collection(COLLECTIONS.PRODUCTS).updateOne({ _id: item.product_id }, updatedFields);

            } else {
                await db.collection(COLLECTIONS.PRODUCTS).updateOne(
                    { _id: item.product_id },
                    {
                        $set: {
                            stock: item.stock,
                            price: item.price,
                            min_stock_level: minStockLevel,
                            approved_on: new Date(),
                            approved_by: ObjectId.createFromHexString(adminIdOnly),
                            status: 'available'
                        }
                    },
                    { upsert: true }
                );
            }
        }

        await db.collection(COLLECTIONS.TRANSACTIONS).updateOne(
            { _id: transactionObjectId },
            { $set: { status: 'approved' } }
        );

        return { message: 'Purchase order approved and inventory updated.' };

    } else if (confirmation === 'reject') {
        await db.collection(COLLECTIONS.TRANSACTIONS).updateOne(
            { _id: transactionObjectId },
            { $set: { status: 'rejected' } }
        );

        return { message: 'Purchase order rejected.' };
    }
}

module.exports = {
    createSalesOrder,
    confirmSalesOrder,
    createPurchaseOrder,
    approveProduct,
    isValidObjectId
};
