import Joi from 'joi';

const objectId = Joi.string().hex().length(24).messages({
  'string.hex': 'Invalid MongoDB ObjectId',
  'string.length': 'Invalid MongoDB ObjectId',
});

const email = Joi.string().email({ tlds: { allow: false } }).max(254).messages({
  'string.email': 'Enter a valid email address',
  'string.max': 'Email cannot exceed 254 characters',
});

const phone = Joi.string().pattern(/^\+?[1-9]\d{7,14}$/).messages({
  'string.pattern.base': 'Enter a valid phone number including country code',
});

const password = Joi.string().min(8).max(72).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).*$/).messages({
  'string.min': 'Password must be at least 8 characters',
  'string.max': 'Password cannot exceed 72 characters',
  'string.pattern.base': 'Password must include uppercase, lowercase, number, and special character',
});

const url = Joi.string().uri({ scheme: ['http', 'https'] }).max(2048).messages({
  'string.uri': 'Enter a valid URL',
  'string.max': 'URL cannot exceed 2048 characters',
});

const latitude = Joi.number().min(-90).max(90).messages({
  'number.base': 'Latitude must be a number',
  'number.min': 'Latitude cannot be below -90',
  'number.max': 'Latitude cannot exceed 90',
});

const longitude = Joi.number().min(-180).max(180).messages({
  'number.base': 'Longitude must be a number',
  'number.min': 'Longitude cannot be below -180',
  'number.max': 'Longitude cannot exceed 180',
});

const imageUrl = Joi.string().uri({ scheme: ['http', 'https'] }).max(2048).messages({
  'string.uri': 'Image URL must be a valid HTTP(S) URL',
  'string.max': 'Image URL cannot exceed 2048 characters',
});

const trimString = (min, max, field) => Joi.string().trim().min(min).max(max).messages({
  'string.empty': `${field} is required`,
  'string.min': `${field} must be at least ${min} characters`,
  'string.max': `${field} cannot exceed ${max} characters`,
});

export {
  objectId,
  email,
  phone,
  password,
  url,
  latitude,
  longitude,
  imageUrl,
  trimString,
};
