// errorMiddleware.js


const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
 
    if (err.isOperational) {
      return res.status(err.statusCode || 500).json({ message: err.message });
    }
  
   
    return res.status(500).json({ message: 'Something went wrong!' });
  };
  
  module.exports = errorHandler;
  