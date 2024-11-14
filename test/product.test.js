const { ObjectId } = require('mongodb');
const { createGlobalProduct, getProductById, getProducts, getProductsByCategory, getCategories, updateProduct, deleteProduct, getLowStockProducts } = require('../models/product');
const { getDB } = require('../config/db');

// Mock the getDB function to avoid actual database calls
jest.mock('../config/db');

describe('Product Model', () => {
    let mockCollection;

    beforeAll(() => {
        // Mock database collection
        mockCollection = {
            insertOne: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn().mockReturnThis(),
            project: jest.fn().mockReturnThis(),
            toArray: jest.fn(),
            findOneAndUpdate: jest.fn(),
            deleteOne: jest.fn()
        };
        getDB.mockReturnValue({ collection: () => mockCollection });
    });

    describe('getProductById', () => {
        it('should return a product by ID', async () => {
            const productId = new ObjectId().toHexString(); // Generate a valid ObjectId
            const mockProduct = { _id: new ObjectId(productId), product_name: 'Test Product' };

            mockCollection.findOne.mockResolvedValue(mockProduct);
            const product = await getProductById(productId);

            expect(product).toEqual(mockProduct);
            expect(mockCollection.findOne).toHaveBeenCalledWith({ _id: new ObjectId(productId) });
        });

        it('should throw an error if product is not found', async () => {
            const productId = new ObjectId().toHexString(); // Use valid ObjectId format

            mockCollection.findOne.mockResolvedValue(null);
            await expect(getProductById(productId)).rejects.toThrow('Product not found');
        });
    });

    describe('updateProduct', () => {
        it('should update a product if user has permission', async () => {
            const productId = new ObjectId().toHexString();
            const updateData = { product_name: 'Updated Product' };
            const mockUpdatedProduct = { _id: new ObjectId(productId), ...updateData };
    
            // Mock findOneAndUpdate to return the updated product as the value
            mockCollection.findOneAndUpdate.mockResolvedValue({ value: mockUpdatedProduct });
    
            const updatedProduct = await updateProduct(productId, updateData, 'admin');
    
            expect(updatedProduct).toEqual(mockUpdatedProduct);
            expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
                { _id: new ObjectId(productId) },
                { $set: updateData },
                { returnDocument: 'after' }
            );
        });
    
        it('should throw an error if product is not found', async () => {
            const productId = new ObjectId().toHexString();
            const updateData = { product_name: 'Updated Product' };
    
            // Mock findOneAndUpdate to simulate a failed update (product not found)
            mockCollection.findOneAndUpdate.mockResolvedValue({ value: null });
    
            await expect(updateProduct(productId, updateData, 'admin')).rejects.toThrow('Product not found or failed to update');
        });
    });
    
    
    describe('deleteProduct', () => {
        it('should delete a product if user is admin', async () => {
            const productId = new ObjectId().toHexString();
    
            // Mock deleteOne to simulate a successful deletion
            mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
    
            const result = await deleteProduct(productId, 'admin');
    
            expect(result).toBe(true);
            expect(mockCollection.deleteOne).toHaveBeenCalledWith({ _id: new ObjectId(productId) });
        });
    
        it('should throw an error if product is not found', async () => {
            const productId = new ObjectId().toHexString();
    
            // Mock deleteOne to simulate product not found
            mockCollection.deleteOne.mockResolvedValue({ deletedCount: 0 });
    
            await expect(deleteProduct(productId, 'admin')).rejects.toThrow('Error deleting product');
        });
    });
    
    
    /*describe('deleteProduct', () => {
        it('should delete a product if user is admin', async () => {
            const productId = new ObjectId().toHexString(); // Generate a valid ObjectId

            mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
            const result = await deleteProduct(productId, 'admin');

            expect(result).toBe(true);
            expect(mockCollection.deleteOne).toHaveBeenCalledWith({ _id: new ObjectId(productId) });
        });

        it('should throw an error if product is not found', async () => {
            const productId = new ObjectId().toHexString(); // Use valid ObjectId format

            mockCollection.deleteOne.mockResolvedValue({ deletedCount: 0 });
            await expect(deleteProduct(productId, 'admin')).rejects.toThrow('Error deleting product');
        });
    });*/
});
