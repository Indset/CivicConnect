import Joi from 'joi';
import { email, password, phone, trimString } from './common.validators.js';

export const registerSchema = Joi.object({
  fullName: trimString(2, 100, 'Full name').required(),
  email: email.required(),
  phone: phone.required(),
  password: password.required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match',
    'any.required': 'confirmPassword is required',
  }),
});

export const loginSchema = Joi.object({
  email: email.required(),
  password: Joi.string().required().messages({ 'any.required': 'Password is required' }),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({ 'any.required': 'currentPassword is required' }),
  newPassword: password.required(),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Passwords do not match',
    'any.required': 'confirmPassword is required',
  }),
});

export const forgotPasswordSchema = Joi.object({
  email: email.required(),
});

export const resetPasswordSchema = Joi.object({
  password: password.required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match',
    'any.required': 'confirmPassword is required',
  }),
});

export const updateProfileSchema = Joi.object({
  fullName: trimString(2, 100, 'Full name').optional(),
  email: email.optional(),
  phone: phone.optional(),
  avatar: Joi.string().uri({ scheme: ['http', 'https'] }).max(2048).optional().messages({
    'string.uri': 'Avatar must be a valid URL',
    'string.max': 'Avatar URL cannot exceed 2048 characters',
  }),
}).or('fullName', 'email', 'phone', 'avatar').messages({
  'object.missing': 'Provide at least one field to update',
});
