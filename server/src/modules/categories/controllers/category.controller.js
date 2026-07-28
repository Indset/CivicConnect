import Category from '../models/category.model.js';
import { ApiResponse } from '../../../utils/ApiResponse.js';

export const listActiveCategories = async (_req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 }).lean();
  return res.status(200).json(new ApiResponse(200, { categories }, 'Categories retrieved successfully'));
};
