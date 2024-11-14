const express = require('express');
const { auth, authorizeRoles } = require('../middleware/auth');
const { getSuppliers, getSupplierById, updateSupplier, deleteSupplier } = require('../models/supplier');
const router = express.Router();


//get all
router.get('/',auth, authorizeRoles('admin','manager'), async (req, res) => {
    try {
        const suppliers = await getSuppliers();
        res.send(suppliers);
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("An error occurred while fetching products.");
    }
});


// Get supplier details by ID (viewable by the supplier user)
router.get('/:id', auth, async (req, res) => {
    try {
        const supplier = await getSupplierById(req.params.id);
        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found.' });
        }
        res.status(200).json(supplier);
    } catch (err) {
        console.error('Error fetching supplier:', err);
        res.status(400).send({ message: 'Error fetching supplier', error: err.message });
    }
});

// Update supplier details by ID (only suppliers can update their own details)
router.put('/:id', auth, async (req, res) => {
    try {
        const supplier = await getSupplierById(req.params.id);
        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found.' });
        }

        // Ensure that the logged-in user is the same as the supplier whose details are being updated
        if (req.user.id !== supplier.userId.toString()) {
            return res.status(403).json({ message: 'You can only update your own supplier details.' });
        }

        const updatedSupplier = await updateSupplier(req.params.id, req.body);
        res.status(200).json(updatedSupplier);
    } catch (err) {
        console.error('Error updating supplier:', err);
        res.status(400).send({ message: 'Error updating supplier', error: err.message });
    }
});

// Delete supplier by ID (only admin can delete supplier)
router.delete('/:id', auth, authorizeRoles('admin'), async (req, res) => {
    try {
        const deleteResult = await deleteSupplier(req.params.id);
        if (!deleteResult) {
            return res.status(404).json({ message: 'Supplier not found or delete failed.' });
        }
        res.status(200).json({ message: 'Supplier deleted successfully.' });
    } catch (err) {
        console.error('Error deleting supplier:', err);
        res.status(400).send({ message: 'Error deleting supplier', error: err.message });
    }
});

module.exports = router;
