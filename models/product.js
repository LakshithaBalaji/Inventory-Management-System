const Joi = require('joi');
const { ObjectId } = require('mongodb');
const { getDB,COLLECTIONS } = require('../config/db');



// Custom ObjectId validation
function isValidObjectId(value, helpers) {
  if (!ObjectId.isValid(value)) {
    return helpers.message('"{{#label}}" must be a valid ObjectId');
  }
  return value;
}


const productSchema = Joi.object({
  product_name: Joi.string()
    .min(3)
    .max(255)
    .required()
    .messages({
      'string.min': 'Product name should be at least 3 characters long.',
      'string.max': 'Product name should not exceed 255 characters.',
      'any.required': 'Product name is required.'
    }),

  category: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.min': 'Category should be at least 3 characters long.',
      'string.max': 'Category should not exceed 100 characters.',
      'any.required': 'Category is required.'
    }),

  price: Joi.number()
    .greater(0)
    .required()
    .messages({
      'number.greater': 'Price must be greater than 0.',
      'any.required': 'Price is required.'
    }),

  stock: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      'number.integer': 'Stock must be a valid integer.',
      'number.min': 'Stock cannot be less than 0.',
      'any.required': 'Stock is required.'
    }),

  min_stock_level: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      'number.integer': 'Minimum stock level must be a valid integer.',
      'number.min': 'Minimum stock level cannot be less than 0.',
      'any.required': 'Minimum stock level is required.'
    }),

  description: Joi.string()
    .min(10)
    .max(1000)
    .required()
    .messages({
      'string.min': 'Description must be at least 10 characters long.',
      'string.max': 'Description cannot exceed 1000 characters.',
      'any.required': 'Description is required.'
    }),

  supplied_by: Joi.string()
    .custom(isValidObjectId)
    .required()
    .messages({
      'any.required': 'Supplier ID is required.',
      'string.custom': 'Supplier ID must be a valid ObjectId.'
    }),

  created_by: Joi.string()
    .custom(isValidObjectId)
    .required()
    .messages({
      'any.required': 'Creator ID is required.',
      'string.custom': 'Creator ID must be a valid ObjectId.'
    }),

  last_updated_by: Joi.string()
    .custom(isValidObjectId)
    .required()
    .messages({
      'any.required': 'Last updated by ID is required.',
      'string.custom': 'Last updated by ID must be a valid ObjectId.'
    }),

  approved_by: Joi.string()
    .custom(isValidObjectId)
    .required()
    .messages({
      'any.required': 'Approved by ID is required.',
      'string.custom': 'Approved by ID must be a valid ObjectId.'
    }),

  created_on: Joi.date()
    .timestamp()
    .default(() => Date.now())
    ,

  updated_on: Joi.date()
    .timestamp()
    .default(() => Date.now())
    ,

  approved_on: Joi.date()
    .timestamp()
    .default(() => Date.now())
    ,

  status: Joi.string()
    .valid('available', 'not available')
    .default('available')
    .messages({
      'any.valid': 'Status must be either "available" or "not available".'
    }),
});

module.exports = productSchema;


async function createGlobalProduct(productData, user) {
  const db = getDB();
  const userId = user._id;

  let suppliedById;
  if (typeof productData.supplied_by === 'string') {
    try {
      suppliedById = ObjectId.createFromHexString(productData.supplied_by);
    } catch (err) {
      throw new Error('Invalid supplied_by ObjectId');
    }
  } else {
    suppliedById = productData.supplied_by;
  }

  const existingProduct = await db.collection(COLLECTIONS.PRODUCTS).findOne({
    product_name: productData.product_name.trim().toLowerCase()
  });
  if (existingProduct) {
    throw new Error(`Product with name '${productData.product_name}' already exists and cannot be created again.`);
  }

  const normalizedData = {
    ...productData,
    product_name: productData.product_name.trim().toLowerCase(),
    created_by: ObjectId.createFromHexString(userId),
    last_updated_by: ObjectId.createFromHexString(userId),
    approved_by: ObjectId.createFromHexString(userId),
    supplied_by: suppliedById,
    status: productData.status || 'available',
  };

  const { error } = productSchema.validate(normalizedData);
  if (error) {
    throw new Error(error.details[0].message);
  }

  const product = {
    ...normalizedData,
    created_on: new Date(),
    updated_on: new Date(),
    approved_on: new Date(),
  };

  try {
    const result = await db.collection(COLLECTIONS.PRODUCTS).insertOne(product);
    return { product_id: result.insertedId, ...product };
  } catch (error) {
    throw new Error(`Database Insertion Error: ${error.message}`);
  }
}

async function getProducts(role) {
  const db = getDB();
  let projection = {};

  if (role === 'customer') {
    projection = {
      product_name: 1,
      category: 1,
      price: 1,
      stock: 1,
      description: 1
    };
  } /*else {
    projection = {
      product_name: 1,
      category: 1,
      price: 1,
      stock: 1,
      min_stock_level: 1,
      description: 1,
      warehouse_location: 1,
      last_updated_by: 1,
      supplied_by: 1,
      created_by: 1,
      created_on: 1,
      updated_on: 1
    };}*/
  

  try {
    const products = await db.collection(COLLECTIONS.PRODUCTS).find({}).project(projection).toArray();
    return products;
  } catch (error) {
    throw new Error('Error retrieving products');
  }
}

async function getProductById(productId,role) {
  const db = getDB();
  let projection = {};

  if (role === 'customer') {
    projection = {
      product_name: 1,
      category: 1,
      price: 1,
      stock: 1,
      description: 1
    };
  }
  try {
    // Handle cases where ObjectId is not required
    const query = { _id: /^[a-fA-F0-9]{24}$/.test(productId) ? new ObjectId(productId) : productId };
    
    // Query the database with projection
    const product = await db
      .collection(COLLECTIONS.PRODUCTS)
      .findOne(query, { projection });

    if (!product) throw new Error('Product not found');
    return product;
  } catch (error) {
    throw new Error(`Error fetching product: ${error.message}`);
  }
}

async function getProductsByCategory(category, role) {
  const db = getDB();

  // Define a specific projection for customers
  const customerProjection = {
    product_name: 1,
    category: 1,
    price: 1,
    stock: 1,
    description: 1,
     
  };

  try {
  
    const projection = role === 'customer' ? customerProjection : {};

    
    const products = await db
      .collection(COLLECTIONS.PRODUCTS)
      .find({ category }, { projection })
      .toArray();

    if (products.length === 0) {
      console.warn(`No products found for the category: ${category}`);
    }

    return products;
  } catch (error) {
    console.error(`Error fetching products by category: ${error.message}`);
    throw error; // Let the caller handle the error
  }
}
async function getCategories() {
  const db = getDB();

  try {
    // Use aggregation to get unique categories
    const categories = await db.collection(COLLECTIONS.PRODUCTS).aggregate([
      {
        $group: { _id: "$category" } // Group by the `category` field
      },
      {
        $replaceRoot: { newRoot: { category: "$_id" } } // Replace _id with `category`
      }
    ]).toArray();

    // Return categories or an empty array
    return categories.map(item => item.category);
  } catch (error) {
    console.error(`Error fetching categories: ${error.message}`, { stack: error.stack });
    throw new Error('Error fetching categories');
  }
}



async function updateProduct(productId, updatedFields, userRole) {
  const db = getDB();

  // Check if the updatedFields includes product_name
  if (updatedFields.product_name) {
      const existingProduct = await db.collection(COLLECTIONS.PRODUCTS).findOne({
          product_name: updatedFields.product_name,
          _id: { $ne: ObjectId.createFromHexString(productId) } // Ensure the check is not for the same product
      });

      // If a product with the same name already exists, throw an error
      if (existingProduct) {
          throw new Error('Product name already exists');
      }
  }

  try {
      // Perform the update operation
      const result = await db.collection(COLLECTIONS.PRODUCTS).findOneAndUpdate(
          { _id: ObjectId.createFromHexString(productId) }, // Ensure productId is being converted to ObjectId correctly
          { $set: updatedFields }, // Fields you want to update
          { returnDocument: 'after' } // Ensures the updated document is returned
      );

      console.log('FindOneAndUpdate Result:', result); // Log the result object for debugging

      // If result.value is null, no product was found or updated
      

      // Return the updated product
      return result;
  } catch (error) {
      console.log('Error:', error); // Log the error message to debug
      throw new Error(`Error updating product: ${error.message}`);
  }
}
async function deleteProduct(productId, userRole) {
  if (!['admin', 'manager'].includes(userRole)) {
    throw new Error('You do not have permission to delete this product.');
  }

  const db = getDB();
  try {
    const deleteResult = await db.collection(COLLECTIONS.PRODUCTS).deleteOne({ _id: ObjectId.createFromHexString(productId) });
    if (deleteResult.deletedCount === 0) {
      throw new Error('Product not found');
    }
    return true;
  } catch (error) {
    throw new Error(`Error deleting product: ${error.message}`);
  }
}

async function getLowStockProducts() {
  const db = getDB();
  try {
    const lowStockProducts = await db.collection(COLLECTIONS.PRODUCTS).find({
      $expr: { $lte: ["$stock", "$min_stock_level"] }
    })
    .project({
      created_on: 0,
      created_by:0,
      updated_on: 0,
      last_updated_by:0,
      approved_on:0,
      approved_by:0,

      // Add other fields to exclude here as needed
    })
    .toArray();

    return lowStockProducts;
  } catch (error) {
    throw new Error(`Error fetching low stock products: ${error.message}`);
  }
}


module.exports = {
  createGlobalProduct,
  getProductById,
  getProducts,
  getProductsByCategory,
  getCategories,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
};
