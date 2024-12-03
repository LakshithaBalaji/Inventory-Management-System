const express = require('express');
const { getDB } = require('../config/db');
const router = express.Router();
const { auth, authorizeRoles } = require('../middleware/auth');

router.get('/inventory', [auth, authorizeRoles('admin', 'manager')], async (req, res) => {
    try {
        const db = getDB();
        const products = await db.collection('products').find().toArray();

        const report = products.map(product => ({
            productId: product._id,
            name: product.name || "Other Product",
            category: product.category,
            stock: product.stock,
            minStockLevel: product.minStockLevel,
            lowStock: product.stock <= product.minStockLevel,
        }));

        const reportByCategory = report.reduce((acc, item) => {
            if (!acc[item.category]) acc[item.category] = [];
            acc[item.category].push(item);
            return acc;
        }, {});

        const totalProducts = products.length;
        const totalCategories = Object.keys(reportByCategory).length;
        const totalQuantity = products.reduce((sum, product) => sum + product.stock, 0);

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

router.get('/sales', [auth, authorizeRoles('admin', 'manager')], async (req, res) => {
    try {
        const db = getDB();
        const salesData = await db.collection('transactions').aggregate([
            // 1. Match only transactions with status 'purchased'
            {
                $match: { "status": "purchased" }
            },
            // 2. Unwind the products array to handle each product in the transaction
            { 
                $unwind: "$products"
            },
            {
                // 3. Lookup to join with the 'products' collection and get product details
                $lookup: {
                    from: 'products',
                    localField: 'products.product_id',  // The field in transactions referencing product_id
                    foreignField: '_id',  // The field in products collection referencing _id
                    as: 'productDetails'
                }
            },
            { 
                // 4. Unwind the 'productDetails' array (since $lookup results in an array)
                $unwind: "$productDetails"
            },
            {
                // 5. Project the fields needed for calculation
                $project: {
                    productId: "$products.product_id",  // Use the product_id from the products array
                    productName: "$productDetails.product_name",  // Get the product_name from the products collection
                    quantity: {
                        $cond: { 
                            if: { $gt: ["$products.quantity", 0] },  // Ensure quantity is greater than 0
                            then: "$products.quantity",
                            else: 0
                        }
                    },
                    price: {
                        $cond: { 
                            if: { $gt: ["$products.price", 0] },  // Ensure price is greater than 0
                            then: "$products.price",
                            else: 0
                        }
                    }
                }
            },
            {
                // 6. Group by productId to sum up the total quantity and sales amount
                $group: {
                    _id: "$productId",
                    productName: { $first: "$productName" },  // Get the product name for each group
                    totalSalesAmount: {
                        $sum: { 
                            $multiply: ["$quantity", "$price"]  // Multiply quantity by price for total sales amount
                        }
                    },
                    totalQuantitySold: { $sum: "$quantity" }  // Sum the quantity sold for each product
                }
            },
            {
                // 7. Project the final output in a clean format
                $project: {
                    productId: "$_id",  // Use productId as the _id field
                    productName: 1,  // Include product name
                    totalSalesAmount: 1,  // Include the total sales amount
                    totalQuantitySold: 1,  // Include the total quantity sold
                    _id: 0  // Exclude the _id field
                }
            }
        ]).toArray();

        res.status(200).json({
            message: "Sales Report",
            salesData: salesData,
        });

    } catch (error) {
        console.error('Error generating sales report:', error);  // Log the detailed error
        res.status(500).json({ message: 'Error generating sales report.', error: error.message });
    }
});







module.exports = router;
