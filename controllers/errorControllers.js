// controllers/errorControllers.js
const AppError = require("../utils/appError");

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.keyValue ? JSON.stringify(err.keyValue) : "";
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

const handleMulterError = (err) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return new AppError("File size too large. Maximum size is 5MB.", 400);
  }
  if (err.code === "LIMIT_FILE_COUNT") {
    return new AppError("Too many files uploaded.", 400);
  }
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return new AppError("Unexpected file field.", 400);
  }
  return new AppError(err.message || "File upload error", 400);
};

// Error Format for Developers
const sendErrorDev = (err, req, res) => {
  res.status(err.statusCode || 500).json({
    status: err.status || "error",
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, req, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // Programming or unknown error: don't leak details
    console.error("ERROR 💥", err);
    res.status(500).json({
      status: "error",
      message: "Something went wrong!",
    });
  }
};

module.exports = (err, req, res, next) => {
  // default values
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if ((process.env.NODE_ENV || "development") === "development") {
    // In development, also handle multer errors for better UX
    if (err.code && err.code.startsWith("LIMIT_")) {
      const multerError = handleMulterError(err);
      return res.status(multerError.statusCode).json({
        status: multerError.status,
        error: multerError,
        message: multerError.message,
        stack: err.stack,
      });
    }
    sendErrorDev(err, req, res);
  } else {
    // In production, avoid shallow-copying Error (loses props). Work with original.
    let error = err;

    // Helpful debug logs (will not be sent to client)
    console.error("Prod error details:", {
      name: error.name,
      code: error.code,
      message: error.message,
      keyValue: error.keyValue,
      errors: error.errors && Object.keys(error.errors),
    });

    // handle mongoose specific errors
    if (error.name === "CastError") error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === "ValidationError") error = handleValidationErrorDB(error);
    // handle multer errors
    if (error.code && String(error.code).startsWith("LIMIT_")) {
      error = handleMulterError(error);
    }

    sendErrorProd(error, req, res);
  }
};
