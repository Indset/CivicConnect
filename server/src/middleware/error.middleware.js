import mongoose from 'mongoose';
import env from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  let normalized = error;

  if (error instanceof mongoose.Error.ValidationError) {
    normalized = new ApiError(400, 'Validation failed', Object.values(error.errors).map((item) => item.message));
  } else if (error instanceof mongoose.Error.CastError) {
    normalized = new ApiError(400, `Invalid ${error.path}: ${error.value}`);
  } else if (error?.code === 11000) {
    normalized = new ApiError(409, 'A resource with those values already exists');
  } else if (!(error instanceof ApiError)) {
    normalized = new ApiError(500, 'Internal server error', [], { cause: error });
  }

  if (!env.isProduction || normalized.statusCode >= 500) console.error(error);
  return res.status(normalized.statusCode).json({
    success: false,
    statusCode: normalized.statusCode,
    message: normalized.message,
    ...(normalized.errors.length > 0 && { errors: normalized.errors }),
    ...(!env.isProduction && { stack: error.stack }),
  });
};
