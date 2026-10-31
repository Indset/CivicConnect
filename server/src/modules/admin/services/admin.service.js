import mongoose from 'mongoose';
import Complaint from '../../complaints/models/complaint.model.js';
import Category from '../../categories/models/category.model.js';
import User from '../../auth/models/user.model.js';
import { createNotification } from '../../notifications/services/notification.service.js';
import { sendComplaintStatusEmail } from '../../complaints/services/complaint-status-email.service.js';
import { ApiError } from '../../../utils/ApiError.js';
import logger from '../../../utils/logger.js';

const complaintPopulation = [
  { path: 'user', select: 'fullName avatar' },
  { path: 'category', select: 'name icon description' },
  { path: 'assignedTo', select: 'fullName avatar role' },
  { path: 'remarks.author', select: 'fullName avatar role' },
];

const buildPagination = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
  hasNextPage: page * limit < total,
  hasPreviousPage: page > 1,
});

const pendingStatuses = ['submitted', 'under_review', 'assigned', 'in_progress'];
const resolvedStatuses = ['resolved', 'closed'];
const statusTransitions = {
  submitted: ['under_review', 'assigned', 'in_progress', 'resolved', 'rejected'],
  under_review: ['assigned', 'in_progress', 'resolved', 'rejected'],
  assigned: ['in_progress', 'resolved', 'rejected'],
  in_progress: ['resolved', 'rejected'],
  resolved: ['closed'],
  rejected: ['closed'],
  closed: [],
};
const statusLabels = {
  submitted: 'Pending',
  under_review: 'Pending review',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  rejected: 'Rejected',
  closed: 'Closed',
};

const validateStatusTransition = (currentStatus, nextStatus) => {
  if (currentStatus === nextStatus) return;
  if (!statusTransitions[currentStatus]?.includes(nextStatus)) {
    throw new ApiError(409, `Cannot change complaint status from ${currentStatus} to ${nextStatus}`);
  }
};

const notifyComplaintOwner = async (complaint, status, note) => {
  const owner = await User.findById(complaint.user).select('fullName email');
  if (!owner) throw new ApiError(404, 'Complaint owner not found');

  const label = statusLabels[status] ?? status;
  const noteText = note ? ` Note: ${note}` : '';
  await createNotification({
    user: owner.id,
    title: 'Complaint status updated',
    message: `${complaint.complaintId}: "${complaint.title}" is now ${label}.${noteText}`,
    type: 'complaint_status',
    complaint: complaint.id,
  });

  Promise.resolve()
    .then(() => sendComplaintStatusEmail({
      email: owner.email,
      fullName: owner.fullName,
      complaint,
      status: label,
      note,
    }))
    .catch((error) => logger.error('Failed to send complaint status email', {
      complaintId: complaint.id,
      ownerId: owner.id,
      error: error.message,
    }));
};

export const getAdminDashboard = async () => {
  const [totalUsers, totalComplaints, pendingComplaints, resolvedComplaints, categoriesCount] = await Promise.all([
    User.countDocuments(),
    Complaint.countDocuments(),
    Complaint.countDocuments({ status: { $in: pendingStatuses } }),
    Complaint.countDocuments({ status: { $in: resolvedStatuses } }),
    Category.countDocuments(),
  ]);

  return {
    totalUsers,
    totalComplaints,
    pendingComplaints,
    resolvedComplaints,
    categoriesCount,
  };
};

export const listAdminComplaints = async (options = {}) => {
  const { search, status, category, priority, assignedTo, fromDate, toDate, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (priority) filter.priority = priority;
  if (assignedTo) filter.assignedTo = assignedTo;
  if (search) filter.$text = { $search: search };
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = fromDate;
    if (toDate) filter.createdAt.$lte = toDate;
  }

  const skip = (page - 1) * limit;
  const direction = sortOrder === 'asc' ? 1 : -1;
  const sort = search ? { score: { $meta: 'textScore' }, [sortBy]: direction, _id: direction } : { [sortBy]: direction, _id: direction };
  const projection = search ? { score: { $meta: 'textScore' } } : undefined;
  const [complaints, total] = await Promise.all([
    Complaint.find(filter, projection).sort(sort).skip(skip).limit(limit).populate(complaintPopulation).lean(),
    Complaint.countDocuments(filter),
  ]);

  return {
    complaints,
    pagination: buildPagination(page, limit, total),
  };
};

export const assignComplaintToUser = async (complaintId, assignedTo, changedBy) => {
  const [complaint, user] = await Promise.all([
    Complaint.findById(complaintId),
    User.findById(assignedTo).select('role isActive fullName'),
  ]);

  if (!complaint) throw new ApiError(404, 'Complaint not found');
  if (!user || !user.isActive) throw new ApiError(404, 'Assigned user not found');

  validateStatusTransition(complaint.status, 'assigned');
  const statusChanged = complaint.status !== 'assigned';
  const note = `Complaint assigned to ${user.fullName}.`;
  const update = { $set: { assignedTo } };
  if (statusChanged) {
    update.$set.status = 'assigned';
    update.$push = { statusHistory: { status: 'assigned', note, changedBy } };
  }
  const updatedComplaint = await Complaint.findOneAndUpdate(
    { _id: complaint._id, status: complaint.status },
    update,
    { new: true, runValidators: true },
  );
  if (!updatedComplaint) throw new ApiError(409, 'Complaint status changed; refresh and try again');
  if (statusChanged) await notifyComplaintOwner(updatedComplaint, 'assigned', note);
  return Complaint.findById(complaint._id).populate(complaintPopulation).lean();
};

export const updateComplaintStatus = async (complaintId, status, changedBy, note = '') => {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) throw new ApiError(404, 'Complaint not found');
  validateStatusTransition(complaint.status, status);
  if (complaint.status === status) {
    return Complaint.findById(complaint._id).populate(complaintPopulation).lean();
  }

  const updatedComplaint = await Complaint.findOneAndUpdate(
    { _id: complaint._id, status: complaint.status },
    {
      $set: { status },
      $push: { statusHistory: { status, note, changedBy } },
    },
    { new: true, runValidators: true },
  );
  if (!updatedComplaint) throw new ApiError(409, 'Complaint status changed; refresh and try again');
  await notifyComplaintOwner(updatedComplaint, status, note);
  return Complaint.findById(complaint._id).populate(complaintPopulation).lean();
};

export const addComplaintRemark = async (complaintId, authorId, message) => {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) throw new ApiError(404, 'Complaint not found');
  complaint.remarks.push({ author: authorId, message });
  await complaint.save();
  return Complaint.findById(complaint._id).populate(complaintPopulation).lean();
};

export const deleteComplaintByAdmin = async (complaintId) => {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) throw new ApiError(404, 'Complaint not found');
  await complaint.deleteOne();
};

export const createCategory = async (data) => {
  const category = await Category.create(data);
  return category.toObject();
};

export const updateCategory = async (categoryId, data) => {
  const category = await Category.findByIdAndUpdate(categoryId, data, { new: true, runValidators: true });
  if (!category) throw new ApiError(404, 'Category not found');
  return category.toObject();
};

export const deleteCategory = async (categoryId) => {
  const category = await Category.findById(categoryId);
  if (!category) throw new ApiError(404, 'Category not found');
  const complaintCount = await Complaint.countDocuments({ category: categoryId });
  if (complaintCount > 0) throw new ApiError(409, 'Cannot delete a category that is currently in use');
  await category.deleteOne();
};

export const setCategoryStatus = async (categoryId, isActive) => {
  const category = await Category.findByIdAndUpdate(categoryId, { isActive }, { new: true, runValidators: true });
  if (!category) throw new ApiError(404, 'Category not found');
  return category.toObject();
};

export const listUsers = async (options = {}) => {
  const { search, role, status, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
  const filter = {};
  if (role) filter.role = role;
  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;
  if (search) {
    filter.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const direction = sortOrder === 'asc' ? 1 : -1;
  const [users, total] = await Promise.all([
    User.find(filter).select('fullName email phone role avatar isActive createdAt updatedAt').sort({ [sortBy]: direction, _id: direction }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  return {
    users,
    pagination: buildPagination(page, limit, total),
  };
};

export const suspendUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.role === 'admin') throw new ApiError(403, 'Admin accounts cannot be suspended');
  user.isActive = false;
  await user.save();
  return user.toObject();
};

export const activateUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  user.isActive = true;
  await user.save();
  return user.toObject();
};

export const changeUserRole = async (userId, role) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  user.role = role;
  await user.save();
  return user.toObject();
};

export const getMonthlyComplaintStats = async () => {
  const stats = await Complaint.aggregate([
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    { $project: { _id: 0, year: '$_id.year', month: '$_id.month', count: 1 } },
  ]);
  return stats;
};

export const getCategoryStats = async () => {
  const stats = await Complaint.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
    { $unwind: '$category' },
    { $project: { _id: 0, categoryId: '$_id', categoryName: '$category.name', count: 1 } },
    { $sort: { count: -1 } },
  ]);
  return stats;
};

export const getStatusStats = async () => {
  return Complaint.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $project: { _id: 0, status: '$_id', count: 1 } },
    { $sort: { count: -1 } },
  ]);
};

export const getPriorityStats = async () => {
  return Complaint.aggregate([
    { $group: { _id: '$priority', count: { $sum: 1 } } },
    { $project: { _id: 0, priority: '$_id', count: 1 } },
    { $sort: { count: -1 } },
  ]);
};

export const getAdminAnalytics = async (range = '6m') => {
  const now = new Date();
  const start = new Date(now);
  if (range === '7d') start.setUTCDate(start.getUTCDate() - 6);
  else if (range === '30d') start.setUTCDate(start.getUTCDate() - 29);
  else {
    start.setUTCDate(1);
    start.setUTCMonth(now.getUTCMonth() - 5);
  }
  start.setUTCHours(0, 0, 0, 0);

  const dateFilter = { createdAt: { $gte: start, $lte: now } };
  const trendFormat = range === '6m' ? '%Y-%m' : '%Y-%m-%d';
  const trendLabelFormat = range === '6m' ? '%b %Y' : '%b %d';
  const [
    total,
    statusCounts,
    categoryCounts,
    trend,
    resolution,
    topUpvoted,
    areaCounts,
  ] = await Promise.all([
    Complaint.countDocuments(dateFilter),
    Complaint.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { _id: 0, status: '$_id', count: 1 } },
      { $sort: { status: 1 } },
    ]),
    Complaint.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          categoryId: '$_id',
          name: { $ifNull: ['$category.name', 'Uncategorized'] },
          count: 1,
        },
      },
      { $sort: { count: -1, name: 1 } },
    ]),
    Complaint.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $dateToString: { format: trendFormat, date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          label: {
            $dateToString: {
              format: trendLabelFormat,
              date: { $dateFromString: { dateString: { $concat: ['$_id', range === '6m' ? '-01' : ''] } } },
            },
          },
          count: 1,
        },
      },
      { $sort: { date: 1 } },
    ]),
    Complaint.aggregate([
      { $match: { ...dateFilter, status: { $in: ['resolved', 'closed'] } } },
      {
        $addFields: {
          resolutionEntry: {
            $first: {
              $filter: {
                input: { $ifNull: ['$statusHistory', []] },
                as: 'entry',
                cond: { $in: ['$$entry.status', ['resolved', 'closed']] },
              },
            },
          },
        },
      },
      {
        $project: {
          durationHours: {
            $divide: [
              { $subtract: [{ $ifNull: ['$resolutionEntry.changedAt', '$updatedAt'] }, '$createdAt'] },
              3600000,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          averageHours: { $avg: '$durationHours' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          hours: '$averageHours',
          days: { $divide: ['$averageHours', 24] },
          count: 1,
        },
      },
    ]),
    Complaint.aggregate([
      { $match: dateFilter },
      {
        $addFields: {
          votes: { $ifNull: ['$upvoteCount', { $size: { $ifNull: ['$upvotes', []] } }] },
        },
      },
      { $sort: { votes: -1, createdAt: -1, _id: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 1,
          complaintId: 1,
          title: 1,
          status: 1,
          upvoteCount: '$votes',
        },
      },
    ]),
    Complaint.aggregate([
      { $match: dateFilter },
      {
        $addFields: {
          area: {
            $ifNull: [
              '$location.address',
              { $ifNull: ['$location.city', '$location'] },
            ],
          },
        },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: [{ $type: '$area' }, 'string'] },
              { $trim: { input: '$area' } },
              null,
            ],
          },
          count: { $sum: 1 },
        },
      },
      { $match: { _id: { $nin: ['', null] } } },
      { $project: { _id: 0, area: '$_id', count: 1 } },
      { $sort: { count: -1, area: 1 } },
      { $limit: 10 },
    ]),
  ]);

  const statusCountsByName = Object.fromEntries(statusCounts.map(({ status, count }) => [status, count]));
  return {
    range,
    dateRange: { from: start, to: now },
    totals: {
      total,
      pending: (statusCountsByName.submitted ?? 0) + (statusCountsByName.under_review ?? 0),
      inProgress: (statusCountsByName.assigned ?? 0) + (statusCountsByName.in_progress ?? 0),
      resolved: (statusCountsByName.resolved ?? 0) + (statusCountsByName.closed ?? 0),
    },
    statusCounts,
    categoryCounts,
    trend,
    averageResolutionTime: resolution[0] ?? { hours: null, days: null, count: 0 },
    topUpvoted,
    areaCounts,
  };
};
