import mongoose from 'mongoose';
import env from '../config/env.js';
import logger from './logger.js';
import { ApiError } from './ApiError.js';
import { AppError } from './AppError.js';

const normalizeError = (error) => {
  if (error instanceof ApiError) return error;
  if (error instanceof AppError) return error;
  if (error instanceof mongoose.Error.ValidationError) {
    return new ApiError(400, 'Validation failed', Object.values(error.errors).map((item) => item.message));
  }
  if (error instanceof mongoose.Error.CastError) {
    return new ApiError(400, `Invalid ${error.path}: ${error.value}`);
  }
  if (error?.code === 11000) {
    return new ApiError(409, 'A resource with those values already exists');
  }
  return new ApiError(500, 'Internal server error', [], { cause: error });
};

export const notFoundHandler = (req, res, next) => {
  const error = new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`);
  logger.warn(`404 - ${req.method} ${req.originalUrl}`);
  return next(error);
};

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  const normalized = normalizeError(error);

  if (normalized.statusCode >= 500) {
    logger.error('Unhandled error', { message: normalized.message, stack: normalized.stack, path: req.originalUrl, method: req.method });
  } else {
    logger.warn(`Client error ${normalized.statusCode} - ${req.method} ${req.originalUrl}: ${normalized.message}`);
  }

  const response = {
    success: false,
    statusCode: normalized.statusCode,
    message: normalized.message,
    ...(normalized.errors?.length > 0 && { errors: normalized.errors }),
    ...(!env.isProduction && normalized.stack ? { stack: normalized.stack } : {}),
  };

  return res.status(normalized.statusCode).json(response);
};
