const express = require('express');
const { ObjectId } = require('mongodb');
const { auth, authorizeRoles } = require('../middleware/auth'); // Import your middleware
const { createGlobalProduct, getProducts, getProductById, getProductsByCategory,getCategories,updateProduct,deleteProduct } = require('../models/product');
const router = express.Router();
const { getDB } = require('../config/db');

// Route to create a global product - only admin can create products
router.post('/', [auth, authorizeRoles('admin')], async (req, res) => {
    try {
        const productData = req.body;
        productData.createdBy = req.user._id; // User info attached to req.user by auth middleware
        const newProduct = await createGlobalProduct(productData, req.user); // Pass req.user to the function
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(400).json({ message: 'Error creating global product', error: error.message });
    }
});



// Route to get all products - all users can view products, but this can be limited to certain roles if needed
router.get('/', auth, async (req, res) => {
    try {
        const role = req.user.role; // Get the user's role from the JWT payload
        const products = await getProducts(role); // Depending on role, filter products
        res.status(200).json(products);
    } catch (error) {
        res.status(400).json({ message: 'Error fetching products', error: error.message });
    }
});
router.get('/:productId',auth, async (req, res) => {
    try {
        const productId = req.params.productId;
        const product = await getProductById(productId);
        res.status(200).json(product);
    } catch (error) {
        res.status(400).json({ message: 'Error fetching global product', error: error.message });
    }
});

// Route to get all distinct categories

router.get('/categories',auth, async (req, res) => {
    try {
        const categories = await getProductsByCategory();
        console.log("Fetched Categories:", categories);

        if (!categories || categories.length === 0) {
            return res.status(404).json({ message: 'No categories found.' });
        }

        res.status(200).json({ categories });
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ message: 'Error fetching categories', error: error.message });
    }
});



// Add the GET route to fetch products by category
router.get('/category/:category', auth,async (req, res) => {
    try {
        const category = req.params.category;  // Get category from URL parameter
        const products = await getProductsByCategory(category);
        res.status(200).json(products);  // Send back the list of products
    } catch (error) {
        res.status(400).json({ message: 'Error fetching products by category', error: error.message });
    }
});

// Route to update a global product - only admin can update products
router.put('/:productId', [auth, authorizeRoles('admin', 'manager')], async (req, res) => {
    try {
        const productId = req.params.productId;
        const updateData = req.body;
        const userRole = req.user.role; // Get role from the authenticated user
        const updatedProduct = await updateProduct(productId, updateData, userRole); // Pass role to updateProduct
        res.status(200).json(updatedProduct);
    } catch (error) {
        res.status(400).json({ message: 'Error updating global product', error: error.message });
    }
});

// Route to delete a global product - only admin can delete products
router.delete('/:productId', [auth, authorizeRoles('admin')], async (req, res) => {
    try {
        const productId = req.params.productId;
        const userRole = req.user.role;
        const success = await deleteProduct(productId,userRole);
        if (!success) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: 'Error deleting global product', error: error.message });
    }
});

module.exports = router;







/*const express = require('express');
const { createGlobalProduct,  getProducts, updateProduct, deleteProduct } = require('../models/globalProducts');
const { auth, authorizeRoles } = require('../middleware/auth'); // Assuming you have an authentication middleware
const router = express.Router();

// Route to create a global product
router.post('/', [auth,authorizeRoles('admin')], async (req, res) => {
    try {
        const productData = req.body;
        productData.createdBy = req.user._id; // Assuming the user ID is stored in the request (e.g., from JWT)
        const newProduct = await createGlobalProduct(productData);
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(400).json({ message: 'Error creating global product', error: error.message });
    }
});

// Route to get a global product by ID
/*router.get('/:productId', auth,async (req, res) => {
    try {
        const productId = req.params.productId;
        const product = await getGlobalProductById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(200).json(product);
    } catch (error) {
        res.status(400).json({ message: 'Error fetching global product', error: error.message });
    }
});

// Route to get all products based on role
router.get('/', auth, async (req, res) => {
    try {
        const role = req.user.role; // Assuming role is in the user data from the JWT
        const products = await getProducts(role);
        res.status(200).json(products);
    } catch (error) {
        res.status(400).json({ message: 'Error fetching products', error: error.message });
    }
});

// Route to update a global product
router.put('/:productId',[auth,authorizeRoles('admin')], async (req, res) => {
    try {
        const productId = req.params.productId;
        const updateData = req.body;
        const userRole = req.user.role; // Ensure that the user role is available here

        console.log("Requesting User Role: ", userRole); // Log the role coming into the handler

        const updatedProduct = await updateProduct(productId, updateData, userRole);
        res.status(200).json(updatedProduct);
    } catch (error) {
        console.log("Error: ", error.message); // Log the error message
        res.status(400).json({ message: error.message, error: error.message });
    }
});


// Route to delete a global product
router.delete('/:productId', [auth,authorizeRoles('admin')], async (req, res) => {
    try {
        const productId = req.params.productId;
        const success = await deleteProduct(productId);
        if (!success) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: 'Error deleting global product', error: error.message });
    }
});

module.exports = router;*/
