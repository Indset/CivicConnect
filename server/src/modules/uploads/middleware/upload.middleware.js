import multer from 'multer';
import path from 'node:path';
import { ApiError } from '../../../utils/ApiError.js';

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new ApiError(422, 'Only PNG, JPEG, JPG, and WEBP images are allowed'));
  }
  return cb(null, true);
};

const limits = {
  fileSize: 5 * 1024 * 1024,
  files: 10,
};

export const uploadSingleImage = multer({
  storage,
  limits,
  fileFilter,
}).single('image');

export const uploadMultipleImages = multer({
  storage,
  limits,
  fileFilter,
}).array('images', 10);

export const uploadSingleImageWithValidation = (req, res, next) => {
  uploadSingleImage(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') return next(new ApiError(413, 'Each image must be 5MB or smaller'));
      if (error.code === 'LIMIT_FILE_COUNT') return next(new ApiError(413, 'Too many files uploaded'));
      return next(new ApiError(400, error.message));
    }
    if (error) return next(error);
    return next();
  });
};

export const uploadMultipleImagesWithValidation = (req, res, next) => {
  uploadMultipleImages(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') return next(new ApiError(413, 'Each image must be 5MB or smaller'));
      if (error.code === 'LIMIT_FILE_COUNT') return next(new ApiError(413, 'Too many files uploaded'));
      return next(new ApiError(400, error.message));
    }
    if (error) return next(error);
    return next();
  });
};
