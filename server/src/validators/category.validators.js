import Joi from 'joi';
import { trimString } from './common.validators.js';

export const createCategorySchema = Joi.object({
  name: trimString(2, 80, 'name').required(),
  icon: Joi.string().max(2048).optional(),
  description: Joi.string().max(500).optional(),
  isActive: Joi.boolean().optional(),
});

export const updateCategorySchema = Joi.object({
  name: trimString(2, 80, 'name').optional(),
  icon: Joi.string().max(2048).optional(),
  description: Joi.string().max(500).optional(),
  isActive: Joi.boolean().optional(),
}).or('name', 'icon', 'description', 'isActive').messages({
  'object.missing': 'Provide at least one field to update',
});
