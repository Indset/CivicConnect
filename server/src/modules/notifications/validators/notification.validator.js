import mongoose from 'mongoose';
import { ApiError } from '../../../utils/ApiError.js';

const TYPES = ['complaint_created', 'complaint_assigned', 'complaint_status', 'complaint_resolved', 'complaint_rejected', 'admin_announcement'];

export const validateCreateNotification = (req, res, next) => {
  const body = req.body ?? {};
  const errors = [];

  if (typeof body.user !== 'string' || !mongoose.isValidObjectId(body.user)) errors.push('user must be a valid user ID');
  if (typeof body.title !== 'string' || body.title.trim().length < 2 || body.title.trim().length > 150) errors.push('title must be 2-150 characters');
  if (typeof body.message !== 'string' || body.message.trim().length < 2 || body.message.trim().length > 1000) errors.push('message must be 2-1000 characters');
  if (body.type !== undefined && !TYPES.includes(body.type)) errors.push(`type must be one of: ${TYPES.join(', ')}`);
  if (body.complaint !== undefined && (typeof body.complaint !== 'string' || !mongoose.isValidObjectId(body.complaint))) errors.push('complaint must be a valid complaint ID');

  if (errors.length) return next(new ApiError(422, 'Notification validation failed', errors));

  req.validatedBody = {
    user: body.user,
    title: body.title.trim(),
    message: body.message.trim(),
    type: body.type ?? 'admin_announcement',
    ...(body.complaint ? { complaint: body.complaint } : {}),
  };
  return next();
};

export const validateNotificationId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return next(new ApiError(400, 'Invalid notification identifier'));
  return next();
};

export const validateNotificationQuery = (req, res, next) => {
  const page = Number.parseInt(req.query.page ?? '1', 10);
  const limit = Number.parseInt(req.query.limit ?? '20', 10);
  const errors = [];
  if (!Number.isInteger(page) || page < 1) errors.push('page must be a positive integer');
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) errors.push('limit must be between 1 and 100');
  if (errors.length) return next(new ApiError(422, 'Invalid notification query', errors));

  req.validatedQuery = { page, limit };
  return next();
};
