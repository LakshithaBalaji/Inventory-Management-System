const express = require('express');
const { ObjectId } = require('mongodb');
const { auth, authorizeRoles } = require('../middleware/auth');
const { createGlobalProduct, getProducts, getProductById, getProductsByCategory, getCategories, updateProduct, deleteProduct } = require('../models/product');
const router = express.Router();
const { getDB } = require('../config/db');

router.post('/', [auth, authorizeRoles('admin')], async (req, res) => {
    try {
        const productData = req.body;
        const user = req.user;
        const newProduct = await createGlobalProduct(productData, user);
        res.status(201).send(newProduct);
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

router.get('/', auth, async (req, res) => {
    try {
        const role = req.user.role;
        const products = await getProducts(role);
        res.status(200).json(products);
    } catch (error) {
        res.status(400).json({ message: 'Error fetching products', error: error.message });
    }
});

router.get('/:productId', auth, async (req, res) => {
    try {
        const role = req.user.role;
        const productId = req.params.productId;
        const product = await getProductById(productId,role);
        res.status(200).json(product);
    } catch (error) {
        res.status(400).json({ message: 'Error fetching global product', error: error.message });
    }
});

router.get('/categories', auth, async (req, res) => {
    try {
        const categories = await getCategories();

        // Check if no categories are found
        if (!categories || categories.length === 0) {
            return res.status(404).json({ message: 'No categories found.' });
        }

        // Return categories with a 200 OK status
        return res.status(200).json({ categories });
    } catch (error) {
        console.error(`Error fetching categories: ${error.message}`); // Log the error for debugging
        return res.status(500).json({ 
            message: 'Error fetching categories', 
            error: error.message 
        });
    }
});

router.get('/category/:category', auth, async (req, res) => {
    try {
        const role = req.user.role;
        const category = req.params.category;
        const products = await getProductsByCategory(category,role);
        res.status(200).json(products);
    } catch (error) {
        res.status(400).json({ message: 'Error fetching products by category', error: error.message });
    }
});

router.put('/:productId',[ auth,authorizeRoles('admin','manager')],async (req, res) => {
    const { productId } = req.params;
    const updateData = req.body;
    const userRole = req.user.role; // Assuming you have a user object populated with role
  
    try {
      const updatedProduct = await updateProduct(productId, updateData, userRole);
      res.status(200).json(updatedProduct);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

router.delete('/:productId', [auth, authorizeRoles('admin')], async (req, res) => {
    try {
        const productId = req.params.productId;
        const userRole = req.user.role;
        const success = await deleteProduct(productId, userRole);
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
