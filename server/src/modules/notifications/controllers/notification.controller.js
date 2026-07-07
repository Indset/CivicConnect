import { ApiResponse } from '../../../utils/ApiResponse.js';
import {
  createNotification,
  deleteNotification,
  getUnreadNotificationCount,
  listUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/notification.service.js';

export const create = async (req, res) => {
  const notification = await createNotification(req.validatedBody);
  return res.status(201).json(new ApiResponse(201, { notification }, 'Notification created successfully'));
};

export const list = async (req, res) => {
  const result = await listUserNotifications(req.user.id, req.validatedQuery);
  return res.status(200).json(new ApiResponse(200, result, 'Notifications retrieved successfully'));
};

export const markSingleRead = async (req, res) => {
  const notification = await markNotificationAsRead(req.params.id, req.user.id);
  return res.status(200).json(new ApiResponse(200, { notification }, 'Notification marked as read'));
};

export const markAllRead = async (req, res) => {
  const result = await markAllNotificationsAsRead(req.user.id);
  return res.status(200).json(new ApiResponse(200, result, 'All notifications marked as read'));
};

export const remove = async (req, res) => {
  await deleteNotification(req.params.id, req.user.id);
  return res.status(200).json(new ApiResponse(200, null, 'Notification deleted successfully'));
};

export const unreadCount = async (req, res) => {
  const result = await getUnreadNotificationCount(req.user.id);
  return res.status(200).json(new ApiResponse(200, result, 'Unread notification count retrieved successfully'));
};
