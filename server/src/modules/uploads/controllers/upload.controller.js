import { ApiResponse } from '../../../utils/ApiResponse.js';
import {
  deleteImageFromCloudinary,
  deleteUnusedImages,
  replaceImageInCloudinary,
  uploadMultipleImagesToCloudinary,
  uploadSingleImageToCloudinary,
} from '../services/upload.service.js';

export const uploadSingle = async (req, res) => {
  const image = await uploadSingleImageToCloudinary(req.file);
  return res.status(201).json(new ApiResponse(201, { image }, 'Image uploaded successfully'));
};

export const uploadMultiple = async (req, res) => {
  const images = await uploadMultipleImagesToCloudinary(req.files ?? []);
  return res.status(201).json(new ApiResponse(201, { images }, 'Images uploaded successfully'));
};

export const deleteImage = async (req, res) => {
  const deleted = await deleteImageFromCloudinary(req.params.publicId);
  return res.status(200).json(new ApiResponse(200, { deleted }, 'Image deleted successfully'));
};

export const replaceImage = async (req, res) => {
  const image = await replaceImageInCloudinary(req.file, req.params.publicId);
  return res.status(200).json(new ApiResponse(200, { image }, 'Image replaced successfully'));
};

export const cleanupUnusedImages = async (req, res) => {
  const deleted = await deleteUnusedImages(req.body?.publicIds ?? []);
  return res.status(200).json(new ApiResponse(200, { deleted }, 'Unused images cleaned up successfully'));
};
