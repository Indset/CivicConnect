import { ApiResponse } from '../../../utils/ApiResponse.js';
import {
  createComplaint,
  deleteComplaint,
  getComplaint,
  listComplaints,
  updateComplaint,
} from '../services/complaint.service.js';

export const create = async (req, res) => {
  const complaint = await createComplaint(req.user.id, req.validatedBody);
  return res.status(201).json(new ApiResponse(201, { complaint }, 'Complaint created successfully'));
};

export const list = async (req, res) => {
  const result = await listComplaints(req.validatedQuery);
  return res.status(200).json(new ApiResponse(200, result, 'Complaints retrieved successfully'));
};

export const search = list;

export const mine = async (req, res) => {
  const result = await listComplaints(req.validatedQuery, req.user.id);
  return res.status(200).json(new ApiResponse(200, result, 'Your complaints retrieved successfully'));
};

export const latest = async (req, res) => {
  const result = await listComplaints({
    ...req.validatedQuery,
    page: 1,
    limit: Math.min(req.validatedQuery.limit, 20),
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  return res.status(200).json(new ApiResponse(200, result, 'Latest complaints retrieved successfully'));
};

export const getOne = async (req, res) => {
  const complaint = await getComplaint(req.params.id);
  return res.status(200).json(new ApiResponse(200, { complaint }, 'Complaint retrieved successfully'));
};

export const update = async (req, res) => {
  const complaint = await updateComplaint(req.params.id, req.user.id, req.validatedBody);
  return res.status(200).json(new ApiResponse(200, { complaint }, 'Complaint updated successfully'));
};

export const remove = async (req, res) => {
  await deleteComplaint(req.params.id, req.user.id);
  return res.status(200).json(new ApiResponse(200, null, 'Complaint deleted successfully'));
};
