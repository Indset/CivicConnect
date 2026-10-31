import mongoose from 'mongoose';
import { ApiError } from '../../../utils/ApiError.js';

const STATUSES = ['submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'rejected', 'closed'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'status', 'priority'];
const USER_SORT_FIELDS = ['createdAt', 'updatedAt', 'fullName', 'email', 'role'];

const buildPagination = (req) => {
  const page = Number.parseInt(req.query.page ?? '1', 10);
  const limit = Number.parseInt(req.query.limit ?? '20', 10);
  if (!Number.isInteger(page) || page < 1) throw new ApiError(422, 'page must be a positive integer');
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new ApiError(422, 'limit must be between 1 and 100');
  return { page, limit };
};

export const validateAdminComplaintQuery = (req, res, next) => {
  try {
    const { page, limit } = buildPagination(req);
    const allowed = ['search', 'status', 'category', 'priority', 'fromDate', 'toDate', 'assignedTo', 'page', 'limit', 'sortBy', 'sortOrder'];
    const unknown = Object.keys(req.query).filter((key) => !allowed.includes(key));
    if (unknown.length) throw new ApiError(422, `Unsupported query parameters: ${unknown.join(', ')}`);

    if (req.query.search && (typeof req.query.search !== 'string' || req.query.search.trim().length > 100)) {
      throw new ApiError(422, 'search cannot exceed 100 characters');
    }
    if (req.query.status && !STATUSES.includes(req.query.status)) throw new ApiError(422, `status must be one of: ${STATUSES.join(', ')}`);
    if (req.query.priority && !PRIORITIES.includes(req.query.priority)) throw new ApiError(422, `priority must be one of: ${PRIORITIES.join(', ')}`);
    if (req.query.category && !mongoose.isValidObjectId(req.query.category)) throw new ApiError(422, 'category must be a valid ID');
    if (req.query.assignedTo && !mongoose.isValidObjectId(req.query.assignedTo)) throw new ApiError(422, 'assignedTo must be a valid ID');
    if (req.query.sortBy && !SORT_FIELDS.includes(req.query.sortBy)) throw new ApiError(422, `sortBy must be one of: ${SORT_FIELDS.join(', ')}`);
    if (req.query.sortOrder && !['asc', 'desc'].includes(req.query.sortOrder)) throw new ApiError(422, 'sortOrder must be asc or desc');

    const fromDate = req.query.fromDate ? new Date(req.query.fromDate) : null;
    const toDate = req.query.toDate ? new Date(req.query.toDate) : null;
    if (fromDate && Number.isNaN(fromDate.getTime())) throw new ApiError(422, 'fromDate must be a valid date');
    if (toDate && Number.isNaN(toDate.getTime())) throw new ApiError(422, 'toDate must be a valid date');
    if (fromDate && toDate && fromDate > toDate) throw new ApiError(422, 'fromDate cannot be after toDate');

    req.validatedQuery = {
      search: req.query.search?.trim(),
      status: req.query.status,
      category: req.query.category,
      priority: req.query.priority,
      assignedTo: req.query.assignedTo,
      fromDate,
      toDate,
      page,
      limit,
      sortBy: req.query.sortBy ?? 'createdAt',
      sortOrder: req.query.sortOrder ?? 'desc',
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

export const validateAnalyticsRange = (req, res, next) => {
  const allowed = ['range'];
  const unknown = Object.keys(req.query).filter((key) => !allowed.includes(key));
  if (unknown.length) {
    return next(new ApiError(422, `Unsupported query parameters: ${unknown.join(', ')}`));
  }
  const range = req.query.range ?? '6m';
  if (!['7d', '30d', '6m'].includes(range)) {
    return next(new ApiError(422, 'range must be 7d, 30d, or 6m'));
  }
  req.validatedQuery = { range };
  return next();
};

export const validateComplaintAssignment = (req, res, next) => {
  const { assignedTo } = req.body ?? {};
  if (!assignedTo || !mongoose.isValidObjectId(assignedTo)) {
    return next(new ApiError(422, 'assignedTo must be a valid user ID'));
  }
  req.validatedBody = { assignedTo };
  return next();
};

export const validateComplaintStatusUpdate = (req, res, next) => {
  const { status } = req.body ?? {};
  if (!status || !STATUSES.includes(status)) return next(new ApiError(422, `status must be one of: ${STATUSES.join(', ')}`));
  req.validatedBody = { status };
  return next();
};

export const validateComplaintRemark = (req, res, next) => {
  const { message } = req.body ?? {};
  if (typeof message !== 'string' || message.trim().length < 3 || message.trim().length > 1000) {
    return next(new ApiError(422, 'message must be between 3 and 1000 characters'));
  }
  req.validatedBody = { message: message.trim() };
  return next();
};

export const validateCategoryCreate = (req, res, next) => {
  const { name, icon, description, isActive } = req.body ?? {};
  const errors = [];
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) errors.push('name must be 2-80 characters');
  if (icon !== undefined && (typeof icon !== 'string' || icon.trim().length > 2048)) errors.push('icon must be a valid string');
  if (description !== undefined && (typeof description !== 'string' || description.trim().length > 500)) errors.push('description must be at most 500 characters');
  if (isActive !== undefined && typeof isActive !== 'boolean') errors.push('isActive must be boolean');
  if (errors.length) return next(new ApiError(422, 'Category validation failed', errors));
  req.validatedBody = {
    name: name.trim(),
    ...(icon !== undefined ? { icon: icon.trim() } : {}),
    ...(description !== undefined ? { description: description.trim() } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
  };
  return next();
};

export const validateCategoryUpdate = (req, res, next) => {
  const body = req.body ?? {};
  const allowed = ['name', 'icon', 'description', 'isActive'];
  const unknown = Object.keys(body).filter((field) => !allowed.includes(field));
  if (unknown.length) return next(new ApiError(422, `Unsupported fields: ${unknown.join(', ')}`));
  if (!Object.keys(body).length) return next(new ApiError(422, 'Provide at least one field to update'));
  const errors = [];
  if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 80)) errors.push('name must be 2-80 characters');
  if (body.icon !== undefined && (typeof body.icon !== 'string' || body.icon.trim().length > 2048)) errors.push('icon must be a valid string');
  if (body.description !== undefined && (typeof body.description !== 'string' || body.description.trim().length > 500)) errors.push('description must be at most 500 characters');
  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') errors.push('isActive must be boolean');
  if (errors.length) return next(new ApiError(422, 'Category validation failed', errors));
  req.validatedBody = Object.fromEntries(Object.entries(body).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]));
  return next();
};

export const validateCategoryId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return next(new ApiError(400, 'Invalid category identifier'));
  return next();
};

export const validateUserQuery = (req, res, next) => {
  try {
    const { page, limit } = buildPagination(req);
    const allowed = ['search', 'role', 'status', 'page', 'limit', 'sortBy', 'sortOrder'];
    const unknown = Object.keys(req.query).filter((key) => !allowed.includes(key));
    if (unknown.length) throw new ApiError(422, `Unsupported query parameters: ${unknown.join(', ')}`);
    if (req.query.search && (typeof req.query.search !== 'string' || req.query.search.trim().length > 100)) throw new ApiError(422, 'search cannot exceed 100 characters');
    if (req.query.role && !['citizen', 'admin'].includes(req.query.role)) throw new ApiError(422, 'role must be citizen or admin');
    if (req.query.status && !['active', 'inactive'].includes(req.query.status)) throw new ApiError(422, 'status must be active or inactive');
    if (req.query.sortBy && !USER_SORT_FIELDS.includes(req.query.sortBy)) throw new ApiError(422, `sortBy must be one of: ${USER_SORT_FIELDS.join(', ')}`);
    if (req.query.sortOrder && !['asc', 'desc'].includes(req.query.sortOrder)) throw new ApiError(422, 'sortOrder must be asc or desc');

    req.validatedQuery = {
      search: req.query.search?.trim(),
      role: req.query.role,
      status: req.query.status,
      page,
      limit,
      sortBy: req.query.sortBy ?? 'createdAt',
      sortOrder: req.query.sortOrder ?? 'desc',
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

export const validateUserId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return next(new ApiError(400, 'Invalid user identifier'));
  return next();
};

export const validateUserRoleChange = (req, res, next) => {
  const { role } = req.body ?? {};
  if (!role || !['citizen', 'admin'].includes(role)) return next(new ApiError(422, 'role must be citizen or admin'));
  req.validatedBody = { role };
  return next();
};
