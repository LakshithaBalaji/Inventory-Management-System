const express = require('express');
const { createSalesOrder, confirmSalesOrder, createPurchaseOrder, approveProduct } = require('../models/transaction');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Create Sales Order
router.post('/sales-order', async (req, res) => {
    try {
        const { salesData, customerId } = req.body;
        const salesOrder = await createSalesOrder(salesData, customerId);
        res.status(201).json(salesOrder);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Confirm Sales Order
router.post('/confirm-sales-order', async (req, res) => {
    try {
        const { orderId, confirmation } = req.body;
        const result = await confirmSalesOrder(orderId, confirmation);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Create Purchase Order
router.post('/purchase-order', auth, async (req, res) => {
    try {
        const { supplierData } = req.body;
        const supplierId = req.user._id; // Get supplierId from the JWT token (req.user will contain the decoded user)

        console.log("Request Body:", req.body);
        console.log("Supplier ID from JWT:", supplierId);

        // Check if 'supplierData' and 'products' array are valid
        if (!supplierData || !Array.isArray(supplierData.products) || supplierData.products.length === 0) {
            return res.status(400).send("Invalid supplier data. Make sure 'supplierData' includes a non-empty 'products' array.");
        }

        // Validate each product item
        for (const item of supplierData.products) {
            if (!item.quantity) { 
                return res.status(400).send("Each product must include 'quantity'.");
            }

            // If 'productId' is null, handle it as a new product creation
            if (item.productId === null) {
                // Log new product submission and automatically add supplierId from JWT
                console.log("Product ID is null, handling new product submission.");
                item.supplierId = supplierId; // Automatically set the supplierId from the token for new products
            } else if (!item.productId) {
                return res.status(400).send("Each product must include 'productId' and 'quantity'.");
            }
        }

        // Pass supplierData and supplierId to createPurchaseOrder function
        const result = await createPurchaseOrder(supplierData, supplierId);
        res.status(200).send(result);

    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});
/*router.post('/purchase-order', async (req, res) => {
    try {
        const { supplierData, supplierId } = req.body;

        console.log("Request Body:", req.body);

        // Check if 'supplierData' and 'products' array are valid
        if (!supplierData || !Array.isArray(supplierData.products) || supplierData.products.length === 0) {
            return res.status(400).send("Invalid supplier data. Make sure 'supplierData' includes a non-empty 'products' array.");
        }

        // Validate each product item
        for (const item of supplierData.products) {
            if (!item.productId || !item.quantity) {  // 'price' is not required
                return res.status(400).send("Each product must include 'productId' and 'quantity'. 'price' is optional.");
            }
        }

        // Pass supplierData and supplierId to createPurchaseOrder function
        const result = await createPurchaseOrder(supplierData, supplierId);
        res.status(200).send(result);

    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});
*/
// Approve or Reject Product
router.post('/approve-product', async (req, res, next) => {
    const { transactionId, action } = req.body;

    console.log('Transaction ID received:', transactionId);

    try {
        const result = await approveProduct(transactionId, action);
        res.send(result);
    } catch (error) {
        console.error('Error in /approve-product route:', error);
        next(error);
    }
});



module.exports = router;
