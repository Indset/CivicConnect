import { ApiResponse } from '../../../utils/ApiResponse.js';
import {
  activateUser,
  addComplaintRemark,
  assignComplaintToUser,
  changeUserRole,
  createCategory,
  deleteCategory,
  deleteComplaintByAdmin,
  getAdminDashboard,
  getCategoryStats,
  getMonthlyComplaintStats,
  getPriorityStats,
  getStatusStats,
  listAdminComplaints,
  listUsers,
  setCategoryStatus,
  suspendUser,
  updateCategory,
  updateComplaintStatus,
} from '../services/admin.service.js';

export const getDashboard = async (req, res) => {
  const dashboard = await getAdminDashboard();
  return res.status(200).json(new ApiResponse(200, { dashboard }, 'Admin dashboard retrieved successfully'));
};

export const listComplaints = async (req, res) => {
  const result = await listAdminComplaints(req.validatedQuery);
  return res.status(200).json(new ApiResponse(200, result, 'Complaints retrieved successfully'));
};

export const assignComplaint = async (req, res) => {
  const complaint = await assignComplaintToUser(req.params.id, req.validatedBody.assignedTo);
  return res.status(200).json(new ApiResponse(200, { complaint }, 'Complaint assigned successfully'));
};

export const changeStatus = async (req, res) => {
  const complaint = await updateComplaintStatus(req.params.id, req.validatedBody.status);
  return res.status(200).json(new ApiResponse(200, { complaint }, 'Complaint status updated successfully'));
};

export const addRemark = async (req, res) => {
  const complaint = await addComplaintRemark(req.params.id, req.user.id, req.validatedBody.message);
  return res.status(200).json(new ApiResponse(200, { complaint }, 'Remark added successfully'));
};

export const deleteComplaint = async (req, res) => {
  await deleteComplaintByAdmin(req.params.id);
  return res.status(200).json(new ApiResponse(200, null, 'Complaint deleted successfully'));
};

export const createCategoryHandler = async (req, res) => {
  const category = await createCategory(req.validatedBody);
  return res.status(201).json(new ApiResponse(201, { category }, 'Category created successfully'));
};

export const updateCategoryHandler = async (req, res) => {
  const category = await updateCategory(req.params.id, req.validatedBody);
  return res.status(200).json(new ApiResponse(200, { category }, 'Category updated successfully'));
};

export const removeCategory = async (req, res) => {
  await deleteCategory(req.params.id);
  return res.status(200).json(new ApiResponse(200, null, 'Category deleted successfully'));
};

export const activateCategory = async (req, res) => {
  const category = await setCategoryStatus(req.params.id, true);
  return res.status(200).json(new ApiResponse(200, { category }, 'Category activated successfully'));
};

export const deactivateCategory = async (req, res) => {
  const category = await setCategoryStatus(req.params.id, false);
  return res.status(200).json(new ApiResponse(200, { category }, 'Category deactivated successfully'));
};

export const listUsersHandler = async (req, res) => {
  const result = await listUsers(req.validatedQuery);
  return res.status(200).json(new ApiResponse(200, result, 'Users retrieved successfully'));
};

export const suspendUserHandler = async (req, res) => {
  const user = await suspendUser(req.params.id);
  return res.status(200).json(new ApiResponse(200, { user }, 'User suspended successfully'));
};

export const activateUserHandler = async (req, res) => {
  const user = await activateUser(req.params.id);
  return res.status(200).json(new ApiResponse(200, { user }, 'User activated successfully'));
};

export const changeUserRoleHandler = async (req, res) => {
  const user = await changeUserRole(req.params.id, req.validatedBody.role);
  return res.status(200).json(new ApiResponse(200, { user }, 'User role changed successfully'));
};

export const getMonthlyStats = async (req, res) => {
  const stats = await getMonthlyComplaintStats();
  return res.status(200).json(new ApiResponse(200, { stats }, 'Monthly complaint statistics retrieved successfully'));
};

export const getCategoryStatsHandler = async (req, res) => {
  const stats = await getCategoryStats();
  return res.status(200).json(new ApiResponse(200, { stats }, 'Category statistics retrieved successfully'));
};

export const getStatusStatsHandler = async (req, res) => {
  const stats = await getStatusStats();
  return res.status(200).json(new ApiResponse(200, { stats }, 'Status statistics retrieved successfully'));
};

export const getPriorityStatsHandler = async (req, res) => {
  const stats = await getPriorityStats();
  return res.status(200).json(new ApiResponse(200, { stats }, 'Priority statistics retrieved successfully'));
};
