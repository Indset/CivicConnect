import mongoose from 'mongoose';
import Complaint from '../../complaints/models/complaint.model.js';
import Category from '../../categories/models/category.model.js';
import User from '../../auth/models/user.model.js';
import { ApiError } from '../../../utils/ApiError.js';

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

export const assignComplaintToUser = async (complaintId, assignedTo) => {
  const [complaint, user] = await Promise.all([
    Complaint.findById(complaintId),
    User.findById(assignedTo).select('role isActive'),
  ]);

  if (!complaint) throw new ApiError(404, 'Complaint not found');
  if (!user || !user.isActive) throw new ApiError(404, 'Assigned user not found');

  complaint.assignedTo = assignedTo;
  complaint.status = 'assigned';
  await complaint.save();
  return Complaint.findById(complaint._id).populate(complaintPopulation).lean();
};

export const updateComplaintStatus = async (complaintId, status) => {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) throw new ApiError(404, 'Complaint not found');
  complaint.status = status;
  await complaint.save();
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
