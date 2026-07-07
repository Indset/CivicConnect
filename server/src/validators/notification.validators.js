import Joi from 'joi';
import { objectId, trimString } from './common.validators.js';

const notificationTypes = ['complaint_created', 'complaint_assigned', 'complaint_status', 'complaint_resolved', 'complaint_rejected', 'admin_announcement'];

export const createNotificationSchema = Joi.object({
  user: objectId.required().messages({ 'any.required': 'user is required' }),
  title: trimString(2, 150, 'title').required(),
  message: trimString(2, 1000, 'message').required(),
  type: Joi.string().valid(...notificationTypes).optional().messages({ 'any.only': 'type must be one of: complaint_created, complaint_assigned, complaint_status, complaint_resolved, complaint_rejected, admin_announcement' }),
  complaint: objectId.optional(),
});
