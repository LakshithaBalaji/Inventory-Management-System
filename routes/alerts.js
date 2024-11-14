const express = require('express');
const Product = require('../models/product'); //
const { auth,authorizeRoles } = require('../middleware/auth');
const router = express.Router();

// Low stock alert route
router.get('/low-stock',auth,authorizeRoles('admin','manager') ,async (req, res) => {
    try {
        

        // Get the low stock products from the Product model
        const lowStockProducts = await Product.getLowStockProducts();

        // If no products are found with low stock, return a 404 response
        if (lowStockProducts.length === 0) {
            return res.status(404).json({ message: 'No low stock products found.' });
        }

        // Respond with the low stock produc
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
