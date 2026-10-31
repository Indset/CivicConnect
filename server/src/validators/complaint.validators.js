import Joi from 'joi';
import { imageUrl, latitude, longitude, objectId, trimString } from './common.validators.js';

const priorityValues = ['low', 'medium', 'high', 'urgent'];
const statusValues = ['submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'rejected', 'closed'];
const locationCoordinates = Joi.object({
  lat: latitude.required(),
  lng: longitude.required(),
}).unknown(false);
const complaintLocation = Joi.alternatives().try(
  trimString(3, 500, 'location'),
  Joi.object({
    address: trimString(3, 500, 'location').required(),
    coordinates: locationCoordinates.optional(),
  }).unknown(false),
);

export const createComplaintSchema = Joi.object({
  category: objectId.required().messages({ 'any.required': 'category is required' }),
  title: trimString(5, 150, 'title').required(),
  description: trimString(20, 5000, 'description').required(),
  location: complaintLocation.required(),
  latitude: latitude.optional(),
  longitude: longitude.optional(),
  priority: Joi.string().valid(...priorityValues).optional().messages({ 'any.only': 'priority must be one of: low, medium, high, urgent' }),
  images: Joi.array().items(Joi.object({ url: imageUrl.required(), publicId: Joi.string().max(255).optional() })).max(10).optional(),
}).and('latitude', 'longitude').messages({ 'object.and': 'Latitude and longitude must be provided together' });

export const updateComplaintSchema = Joi.object({
  category: objectId.optional(),
  title: trimString(5, 150, 'title').optional(),
  description: trimString(20, 5000, 'description').optional(),
  location: complaintLocation.optional(),
  latitude: latitude.optional(),
  longitude: longitude.optional(),
  priority: Joi.string().valid(...priorityValues).optional().messages({ 'any.only': 'priority must be one of: low, medium, high, urgent' }),
  images: Joi.array().items(Joi.object({ url: imageUrl.required(), publicId: Joi.string().max(255).optional() })).max(4).optional(),
}).and('latitude', 'longitude').or('category', 'title', 'description', 'location', 'latitude', 'longitude', 'priority', 'images').messages({
  'object.missing': 'Provide at least one field to update',
  'object.and': 'Latitude and longitude must be provided together',
});

export const assignComplaintSchema = Joi.object({
  assignedTo: objectId.required().messages({ 'any.required': 'assignedTo is required' }),
});

export const updateComplaintStatusSchema = Joi.object({
  status: Joi.string().valid(...statusValues).required().messages({ 'any.only': 'status must be one of: submitted, under_review, assigned, in_progress, resolved, rejected, closed' }),
  note: trimString(1, 1000, 'note').optional(),
});
