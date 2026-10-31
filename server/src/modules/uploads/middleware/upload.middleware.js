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
const complaintImageUpload = multer({
  storage,
  limits: { fileSize: limits.fileSize, files: 4 },
  fileFilter,
}).array('images', 4);

const hasValidImageSignature = (file) => {
  const { buffer, mimetype } = file;
  if (mimetype === 'image/png') {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mimetype === 'image/jpeg' || mimetype === 'image/jpg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  return mimetype === 'image/webp'
    && buffer.toString('ascii', 0, 4) === 'RIFF'
    && buffer.toString('ascii', 8, 12) === 'WEBP';
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

export const uploadComplaintImagesWithValidation = (req, res, next) => {
  complaintImageUpload(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') return next(new ApiError(413, 'Each image must be 5MB or smaller'));
      if (error.code === 'LIMIT_FILE_COUNT') return next(new ApiError(413, 'A complaint can contain at most 4 images'));
      return next(new ApiError(400, error.message));
    }
    if (error) return next(error);
    if ((req.files ?? []).some((file) => !hasValidImageSignature(file))) {
      return next(new ApiError(422, 'Each file must be a valid JPEG, PNG, or WEBP image'));
    }
    return next();
  });
};
