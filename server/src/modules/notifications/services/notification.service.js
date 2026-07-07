import Notification from '../models/notification.model.js';
import User from '../../auth/models/user.model.js';
import { ApiError } from '../../../utils/ApiError.js';

const buildPagination = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
  hasNextPage: page * limit < total,
  hasPreviousPage: page > 1,
});

export const createNotification = async (data) => {
  const user = await User.findById(data.user).select('_id');
  if (!user) throw new ApiError(404, 'User not found');

  const notification = await Notification.create(data);
  return notification.toObject();
};

export const listUserNotifications = async (userId, options = {}) => {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find({ user: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments({ user: userId }),
  ]);

  return {
    notifications,
    pagination: buildPagination(page, limit, total),
  };
};

export const markNotificationAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({ _id: notificationId, user: userId });
  if (!notification) throw new ApiError(404, 'Notification not found');

  notification.isRead = true;
  await notification.save();
  return notification.toObject();
};

export const markAllNotificationsAsRead = async (userId) => {
  const result = await Notification.updateMany({ user: userId, isRead: false }, { isRead: true, readAt: new Date() });
  return { modifiedCount: result.modifiedCount };
};

export const deleteNotification = async (notificationId, userId) => {
  const notification = await Notification.findOne({ _id: notificationId, user: userId });
  if (!notification) throw new ApiError(404, 'Notification not found');
  await notification.deleteOne();
};

export const getUnreadNotificationCount = async (userId) => {
  const count = await Notification.countDocuments({ user: userId, isRead: false });
  return { unreadCount: count };
};
