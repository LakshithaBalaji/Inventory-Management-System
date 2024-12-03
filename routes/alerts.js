const express = require('express');
const Product = require('../models/product');
const { auth, authorizeRoles } = require('../middleware/auth');
const router = express.Router();

router.get('/low-stock', auth, authorizeRoles('admin', 'manager'), async (req, res) => {
    try {
        const lowStockProducts = await Product.getLowStockProducts();

        if (lowStockProducts.length === 0) {
            return res.status(404).json({ message: 'No low stock products found.' });
        }

        res.status(200).json({
            message: 'Low stock products fetched successfully.',
            data: lowStockProducts
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Error fetching low stock products.',
            error: error.message
        });
    }
});

module.exports = router;
