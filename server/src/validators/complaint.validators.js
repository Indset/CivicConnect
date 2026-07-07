import Joi from 'joi';
import { imageUrl, latitude, longitude, objectId, trimString } from './common.validators.js';

const priorityValues = ['low', 'medium', 'high', 'urgent'];
const statusValues = ['submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'rejected', 'closed'];

export const createComplaintSchema = Joi.object({
  category: objectId.required().messages({ 'any.required': 'category is required' }),
  title: trimString(5, 150, 'title').required(),
  description: trimString(20, 5000, 'description').required(),
  location: trimString(3, 500, 'location').required(),
  latitude: latitude.optional(),
  longitude: longitude.optional(),
  priority: Joi.string().valid(...priorityValues).optional().messages({ 'any.only': 'priority must be one of: low, medium, high, urgent' }),
  images: Joi.array().items(Joi.object({ url: imageUrl.required(), publicId: Joi.string().max(255).optional() })).max(10).optional(),
}).oxor('latitude', 'longitude').messages({ 'oxor': 'latitude and longitude must be provided together' });

export const updateComplaintSchema = Joi.object({
  category: objectId.optional(),
  title: trimString(5, 150, 'title').optional(),
  description: trimString(20, 5000, 'description').optional(),
  location: trimString(3, 500, 'location').optional(),
  latitude: latitude.optional(),
  longitude: longitude.optional(),
  priority: Joi.string().valid(...priorityValues).optional().messages({ 'any.only': 'priority must be one of: low, medium, high, urgent' }),
  images: Joi.array().items(Joi.object({ url: imageUrl.required(), publicId: Joi.string().max(255).optional() })).max(10).optional(),
}).or('category', 'title', 'description', 'location', 'latitude', 'longitude', 'priority', 'images').messages({
  'object.missing': 'Provide at least one field to update',
});

export const assignComplaintSchema = Joi.object({
  assignedTo: objectId.required().messages({ 'any.required': 'assignedTo is required' }),
});

export const updateComplaintStatusSchema = Joi.object({
  status: Joi.string().valid(...statusValues).required().messages({ 'any.only': 'status must be one of: submitted, under_review, assigned, in_progress, resolved, rejected, closed' }),
});
