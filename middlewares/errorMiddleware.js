// A custom error class can be helpful for defining specific HTTP errors.
const { NODE_ENV } = require("../config/config");

class CustomError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Global error-handling middleware
const errorHandler = (err, req, res, next) => {
  // Check if a status code is defined, otherwise default to 500
  const statusCode = err.statusCode || 500;
 
  const message = err.message || 'Internal Server Error';

  console.error(err.stack); 

  // Send a JSON response to the client
  res.status(statusCode).json({
    success: false,
    error: {
      message: message,
      // In development, you might include the stack, but hide it in production
      stack: NODE_ENV === 'development' ? err.stack : undefined,
    },
  });
};

module.exports = { errorHandler, CustomError };