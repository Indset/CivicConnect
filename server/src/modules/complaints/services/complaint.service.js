import mongoose from 'mongoose';
import Complaint from '../models/complaint.model.js';
import Category from '../../categories/models/category.model.js';
import { createNotification } from '../../notifications/services/notification.service.js';
import { ApiError } from '../../../utils/ApiError.js';

const population = [
  { path: 'user', select: 'fullName avatar' },
  { path: 'category', select: 'name icon description' },
  { path: 'assignedTo', select: 'fullName avatar role' },
  { path: 'remarks.author', select: 'fullName avatar role' },
];

const identifierFilter = (id) => mongoose.isValidObjectId(id) ? { _id: id } : { complaintId: id };

const ensureActiveCategory = async (categoryId) => {
  const category = await Category.exists({ _id: categoryId, isActive: true });
  if (!category) throw new ApiError(422, 'Selected category does not exist or is inactive');
};

const ensureOwnerCanModify = (complaint, userId) => {
  const isOwner = complaint.user?.toString() === userId?.toString();
  if (!isOwner) throw new ApiError(403, 'Only the complaint owner can modify this complaint');
  const isLocked = Boolean(complaint.assignedTo) || ['assigned', 'in_progress', 'resolved', 'closed'].includes(complaint.status);
  if (isLocked) {
    throw new ApiError(409, 'This complaint can no longer be modified because it has been assigned');
  }
};

export const createComplaint = async (ownerId, data) => {
  await ensureActiveCategory(data.category);
  const complaint = new Complaint({ ...data, user: ownerId });
  complaint.statusHistory.push({
    status: complaint.status,
    note: 'Complaint submitted',
    changedBy: ownerId,
  });
  await complaint.save();
  return Complaint.findById(complaint._id).populate(population).lean();
};

export const listMapComplaints = async () => {
  const complaints = await Complaint.find({
    $or: [
      { 'location.coordinates.lat': { $type: 'number' }, 'location.coordinates.lng': { $type: 'number' } },
      { latitude: { $type: 'number' }, longitude: { $type: 'number' } },
    ],
  })
    .select('complaintId title category status location latitude longitude')
    .populate({ path: 'category', select: 'name' })
    .lean();

  return complaints.map((complaint) => {
    const storedCoordinates = typeof complaint.location === 'object'
      ? complaint.location?.coordinates
      : null;
    const coordinates = storedCoordinates ?? (
      Number.isFinite(complaint.latitude) && Number.isFinite(complaint.longitude)
        ? { lat: complaint.latitude, lng: complaint.longitude }
        : undefined
    );
    const address = typeof complaint.location === 'string'
      ? complaint.location
      : complaint.location?.address;
    return {
      _id: complaint._id,
      complaintId: complaint.complaintId,
      title: complaint.title,
      category: complaint.category,
      status: complaint.status,
      location: { address, ...(coordinates ? { coordinates } : {}) },
    };
  });
};

export const toggleComplaintUpvote = async (id, userId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const currentUpvotes = { $ifNull: ['$upvotes', []] };
  const alreadyUpvoted = { $in: [userObjectId, currentUpvotes] };
  const currentCount = { $size: currentUpvotes };
  const updatedUpvotes = {
    $cond: [
      alreadyUpvoted,
      { $setDifference: [currentUpvotes, [userObjectId]] },
      { $setUnion: [currentUpvotes, [userObjectId]] },
    ],
  };
  const updatedCount = { $size: updatedUpvotes };
  const milestonesToNotify = {
    $filter: {
      input: [10, 25, 50],
      as: 'milestone',
      cond: {
        $and: [
          { $lt: [currentCount, '$$milestone'] },
          { $gte: [updatedCount, '$$milestone'] },
          {
            $eq: [
              { $in: ['$$milestone', { $ifNull: ['$notifiedUpvoteMilestones', []] }] },
              false,
            ],
          },
        ],
      },
    },
  };
  const complaint = await Complaint.findOneAndUpdate(
    identifierFilter(id),
    [{
      $set: {
        upvotes: updatedUpvotes,
        upvoteCount: updatedCount,
        upvoteMilestonesToNotify: milestonesToNotify,
        notifiedUpvoteMilestones: {
          $setUnion: [{ $ifNull: ['$notifiedUpvoteMilestones', []] }, milestonesToNotify],
        },
      },
    }],
    {
      new: true,
      projection: {
        upvotes: 1,
        upvoteCount: 1,
        user: 1,
        title: 1,
        complaintId: 1,
        upvoteMilestonesToNotify: 1,
      },
    },
  ).lean();

  if (!complaint) throw new ApiError(404, 'Complaint not found');
  await Promise.all(complaint.upvoteMilestonesToNotify.map((milestone) => createNotification({
    user: complaint.user,
    title: 'Complaint reached an upvote milestone',
    message: `${complaint.complaintId}: "${complaint.title}" received ${milestone} upvotes.`,
    type: 'complaint_upvote_milestone',
    complaint: complaint._id,
  })));
  return {
    upvoted: complaint.upvotes.some((upvote) => upvote.toString() === userId.toString()),
    upvoteCount: complaint.upvoteCount,
  };
};

export const listPublicComplaints = async (options, userId) => {
  const { category, status, search, page, limit, sort } = options;
  const filter = {};
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (search) filter.$text = { $search: search };

  const sortBy = sort === 'most_upvoted'
    ? { upvoteCount: -1, createdAt: -1, _id: -1 }
    : { createdAt: -1, _id: -1 };
  const skip = (page - 1) * limit;
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const [complaints, total] = await Promise.all([
    Complaint.find(filter)
      .sort(sortBy)
      .skip(skip)
      .limit(limit)
      .select('complaintId title description category status priority location images createdAt upvotes upvoteCount')
      .populate({ path: 'category', select: 'name icon' })
      .lean(),
    Complaint.countDocuments(filter),
  ]);

  return {
    complaints: complaints.map((complaint) => {
      const { upvotes = [], ...publicComplaint } = complaint;
      return {
        ...publicComplaint,
        upvoteCount: complaint.upvoteCount ?? upvotes.length,
        hasUpvoted: upvotes.some((upvote) => upvote.equals(userObjectId)),
      };
    }),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  };
};

export const listComplaints = async (options, ownerId = null) => {
  const { search, status, category, priority, fromDate, toDate, page, limit, sortBy, sortOrder } = options;
  const filter = {};
  if (ownerId) filter.user = ownerId;
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (priority) filter.priority = priority;
  if (search) filter.$text = { $search: search };
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = fromDate;
    if (toDate) filter.createdAt.$lte = toDate;
  }

  const skip = (page - 1) * limit;
  const direction = sortOrder === 'asc' ? 1 : -1;
  const sort = search
    ? { score: { $meta: 'textScore' }, [sortBy]: direction, _id: direction }
    : { [sortBy]: direction, _id: direction };
  const projection = search ? { score: { $meta: 'textScore' } } : undefined;

  const [complaints, total] = await Promise.all([
    Complaint.find(filter, projection).sort(sort).skip(skip).limit(limit).populate(population).lean(),
    Complaint.countDocuments(filter),
  ]);

  return {
    complaints,
    pagination: {
      page, limit, total,
      pages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  };
};

export const getComplaint = async (id) => {
  const complaint = await Complaint.findOne(identifierFilter(id)).populate(population).lean();
  if (!complaint) throw new ApiError(404, 'Complaint not found');
  return complaint;
};

export const updateComplaint = async (id, ownerId, updates) => {
  const complaint = await Complaint.findOne(identifierFilter(id));
  if (!complaint) throw new ApiError(404, 'Complaint not found');
  ensureOwnerCanModify(complaint, ownerId);
  if (updates.category) await ensureActiveCategory(updates.category);
  Object.assign(complaint, updates);
  await complaint.save();
  return Complaint.findById(complaint._id).populate(population).lean();
};

export const deleteComplaint = async (id, ownerId) => {
  const complaint = await Complaint.findOne(identifierFilter(id));
  if (!complaint) throw new ApiError(404, 'Complaint not found');
  ensureOwnerCanModify(complaint, ownerId);
  await complaint.deleteOne();
};
