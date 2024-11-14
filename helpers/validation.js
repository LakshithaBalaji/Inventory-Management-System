// validation.js
const { ObjectId } = require('mongodb');

// Helper function to check if an ObjectId is valid
function isValidObjectId(id) {
    return ObjectId.isValid(id);
}

module.exports = { isValidObjectId };
