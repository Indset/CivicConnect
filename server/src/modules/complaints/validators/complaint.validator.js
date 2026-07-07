import mongoose from 'mongoose';
import { ApiError } from '../../../utils/ApiError.js';

const STATUSES = ['submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'rejected', 'closed'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'status', 'priority'];
const BODY_FIELDS = ['category', 'title', 'description', 'location', 'latitude', 'longitude', 'images', 'priority'];

const validateImage = (image, index, errors) => {
  if (!image || typeof image !== 'object' || Array.isArray(image)) return errors.push(`images[${index}] must be an object`);
  if (typeof image.url !== 'string' || !/^https?:\/\//i.test(image.url) || image.url.length > 2048) errors.push(`images[${index}].url must be a valid HTTP(S) URL`);
  if (image.publicId !== undefined && (typeof image.publicId !== 'string' || image.publicId.length > 255)) errors.push(`images[${index}].publicId is invalid`);
};

const validateBody = ({ partial }) => (req, res, next) => {
  const body = req.body ?? {};
  const errors = [];
  const unknown = Object.keys(body).filter((field) => !BODY_FIELDS.includes(field));
  if (unknown.length) errors.push(`Unsupported fields: ${unknown.join(', ')}`);
  const required = ['category', 'title', 'description', 'location'];
  if (!partial) required.forEach((field) => { if (body[field] === undefined || body[field] === '') errors.push(`${field} is required`); });
  if (partial && !BODY_FIELDS.some((field) => body[field] !== undefined)) errors.push('Provide at least one field to update');

  if (body.category !== undefined && !mongoose.isValidObjectId(body.category)) errors.push('category must be a valid ID');
  if (body.title !== undefined && (typeof body.title !== 'string' || body.title.trim().length < 5 || body.title.trim().length > 150)) errors.push('title must be 5-150 characters');
  if (body.description !== undefined && (typeof body.description !== 'string' || body.description.trim().length < 20 || body.description.trim().length > 5000)) errors.push('description must be 20-5000 characters');
  if (body.location !== undefined && (typeof body.location !== 'string' || body.location.trim().length < 3 || body.location.trim().length > 500)) errors.push('location must be 3-500 characters');
  if (body.priority !== undefined && !PRIORITIES.includes(body.priority)) errors.push(`priority must be one of: ${PRIORITIES.join(', ')}`);
  if (body.latitude !== undefined && (typeof body.latitude !== 'number' || body.latitude < -90 || body.latitude > 90)) errors.push('latitude must be between -90 and 90');
  if (body.longitude !== undefined && (typeof body.longitude !== 'number' || body.longitude < -180 || body.longitude > 180)) errors.push('longitude must be between -180 and 180');
  const hasLatitude = body.latitude !== undefined;
  const hasLongitude = body.longitude !== undefined;
  if ((hasLatitude || hasLongitude) && (hasLatitude !== hasLongitude)) errors.push('latitude and longitude must be provided together');
  if (body.images !== undefined) {
    if (!Array.isArray(body.images) || body.images.length > 10) errors.push('images must be an array containing at most 10 items');
    else body.images.forEach((image, index) => validateImage(image, index, errors));
  }
  if (errors.length) return next(new ApiError(422, 'Complaint validation failed', errors));

  req.validatedBody = Object.fromEntries(BODY_FIELDS.filter((field) => body[field] !== undefined).map((field) => {
    const value = typeof body[field] === 'string' ? body[field].trim() : body[field];
    return [field, value];
  }));
  return next();
};

export const validateCreateComplaint = validateBody({ partial: false });
export const validateUpdateComplaint = validateBody({ partial: true });

export const validateComplaintId = (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id) && !/^CC-[0-9a-f-]{36}$/i.test(id)) return next(new ApiError(400, 'Invalid complaint identifier'));
  return next();
};

export const validateComplaintQuery = (req, res, next) => {
  const allowed = ['search', 'status', 'category', 'priority', 'fromDate', 'toDate', 'page', 'limit', 'sortBy', 'sortOrder'];
  const unknown = Object.keys(req.query).filter((key) => !allowed.includes(key));
  const errors = unknown.length ? [`Unsupported query parameters: ${unknown.join(', ')}`] : [];
  const page = Number.parseInt(req.query.page ?? '1', 10);
  const limit = Number.parseInt(req.query.limit ?? '20', 10);
  if (!Number.isInteger(page) || page < 1) errors.push('page must be a positive integer');
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) errors.push('limit must be between 1 and 100');
  if (req.query.search && (typeof req.query.search !== 'string' || req.query.search.trim().length > 100)) errors.push('search cannot exceed 100 characters');
  if (req.query.status && !STATUSES.includes(req.query.status)) errors.push(`status must be one of: ${STATUSES.join(', ')}`);
  if (req.query.priority && !PRIORITIES.includes(req.query.priority)) errors.push(`priority must be one of: ${PRIORITIES.join(', ')}`);
  if (req.query.category && !mongoose.isValidObjectId(req.query.category)) errors.push('category must be a valid ID');
  if (req.query.sortBy && !SORT_FIELDS.includes(req.query.sortBy)) errors.push(`sortBy must be one of: ${SORT_FIELDS.join(', ')}`);
  if (req.query.sortOrder && !['asc', 'desc'].includes(req.query.sortOrder)) errors.push('sortOrder must be asc or desc');
  const fromDate = req.query.fromDate ? new Date(req.query.fromDate) : null;
  const toDate = req.query.toDate ? new Date(req.query.toDate) : null;
  if (fromDate && Number.isNaN(fromDate.getTime())) errors.push('fromDate must be a valid date');
  if (toDate && Number.isNaN(toDate.getTime())) errors.push('toDate must be a valid date');
  if (fromDate && toDate && fromDate > toDate) errors.push('fromDate cannot be after toDate');
  if (errors.length) return next(new ApiError(422, 'Invalid complaint query', errors));

  req.validatedQuery = {
    search: req.query.search?.trim(), status: req.query.status, category: req.query.category,
    priority: req.query.priority, fromDate, toDate, page, limit,
    sortBy: req.query.sortBy ?? 'createdAt', sortOrder: req.query.sortOrder ?? 'desc',
  };
  return next();
};

