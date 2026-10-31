import mongoose from 'mongoose';
import { ApiError } from '../../../utils/ApiError.js';

const STATUSES = ['submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'rejected', 'closed'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'status', 'priority'];

export const parseMultipartLocation = (req, res, next) => {
  if (req.is('multipart/form-data') && typeof req.body?.location === 'string') {
    try {
      const location = JSON.parse(req.body.location);
      if (location && typeof location === 'object' && !Array.isArray(location)) {
        req.body.location = location;
      }
    } catch {
      return next(new ApiError(422, 'Location must be valid JSON'));
    }
  }
  return next();
};

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
