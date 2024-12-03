const express = require('express');
const { createSalesOrder, confirmSalesOrder, createPurchaseOrder, approveProduct } = require('../models/transaction');
const { auth } = require('../middleware/auth');
const router = express.Router();
const { getDB,COLLECTIONS } = require('../config/db'); 

router.post('/sales-order', auth, async (req, res) => {
    try {
        const { products } = req.body;
        const result = await createSalesOrder(products, req.user._id);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.post('/confirm-sales-order/:orderId', auth, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { confirmation } = req.body;
        const result = await confirmSalesOrder(orderId, confirmation, req);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.post('/purchase-order', auth, async (req, res) => {
    try {
        const supplierId = req.user._id;
        const { products } = req.body;
        const result = await createPurchaseOrder({ products }, supplierId);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.post('/approve-product/:transactionId', auth, async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { minStockLevel, confirmation } = req.body;

        if (!confirmation || !['approve', 'reject'].includes(confirmation)) {
            return res.status(400).json({ message: 'Confirmation must be either "approve" or "reject".' });
        }

        const adminId = req.user._id;
        const result = await approveProduct(transactionId, adminId, minStockLevel, confirmation);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
