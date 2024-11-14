const express = require('express');
const { getDB } = require('../config/db');
const router = express.Router();
const { auth, authorizeRoles } = require('../middleware/auth');

// GET /api/reports/inventory - Generate Inventory Report
router.get('/inventory', [auth, authorizeRoles('admin', 'manager')], async (req, res) => {
    try {
        const db = getDB();

        // Aggregate the products from the globalproducts collection
        const products = await db.collection('products').find().toArray();

        // Prepare report data
        const report = products.map(product => ({
            productId: product._id,
            name: product.name || "Unnamed Product",
            category: product.category,
            stock: product.stock,
            minStockLevel: product.minStockLevel,
            lowStock: product.stock <= product.minStockLevel,
        }));

        // Organize products by category
        const reportByCategory = report.reduce((acc, item) => {
            if (!acc[item.category]) acc[item.category] = [];
            acc[item.category].push(item);
            return acc;
        }, {});

        // Calculate totals
        const totalProducts = products.length;
        const totalCategories = Object.keys(reportByCategory).length;
        const totalQuantity = products.reduce((sum, product) => sum + product.stock, 0);

        // Send the report with totals at the top
        res.status(200).json({
            message: "Inventory Report",
            totals: {
                totalProducts,
                totalCategories,
                totalQuantity,
            },
            inventoryStatus: "Based on category",
            reportByCategory,
        });

    } catch (error) {
        console.error('Error generating inventory report:', error);
        res.status(500).json({ message: 'Error generating inventory report.' });
    }
});

// GET /api/reports/sales - Generate Sales Report
// GET /api/reports/sales - Generate Sales Report
router.get('/sales', [auth, authorizeRoles('admin', 'manager')], async (req, res) => {
    try {
        const db = getDB();

        // Fetch product sales data from the transactions collection
        const salesData = await db.collection('transactions').aggregate([
            // Step 1: Unwind the 'products' array in the transactions collection
            { $unwind: "$products" },

            // Step 2: Group by 'productId' and calculate total sales and quantity sold
            {
                $group: {
                    _id: "$products.productId", // Group by productId from the transactions collection
                    totalSales: { $sum: { $multiply: ["$products.quantity", "$products.price"] } },
                    quantitySold: { $sum: "$products.quantity" }
                }
            },
        ]).toArray();

        // Send the sales report
        res.status(200).json({
            message: "Sales Report",
            salesData: salesData,
        });

    } catch (error) {
        console.error('Error generating sales report:', error);
        res.status(500).json({ message: 'Error generating sales report.' });
    }
});


module.exports = router;
