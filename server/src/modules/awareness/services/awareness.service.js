import mongoose from "mongoose";
import { ApiError } from "../../../utils/ApiError.js";
import Drive from "../models/drive.model.js";
import Tip from "../models/tip.model.js";

const tipCategories = [
  "Cleanliness",
  "Traffic",
  "Water",
  "Noise",
  "Public property",
];

const eventEndTime = (drive) => {
  const date = new Date(drive.date);
  const [hours, minutes] = drive.endTime.split(":").map(Number);
  date.setUTCHours(hours, minutes, 0, 0);
  return date;
};

const withDriveStatus = (drive, now = new Date(), userId) => {
  const { participants = [], ...publicDrive } = drive;
  return {
    ...publicDrive,
    participantsCount: participants.length,
    hasJoined: Boolean(
      userId &&
        participants.some(
          (participant) =>
            (participant._id ?? participant).toString() === userId.toString(),
        ),
    ),
    status: eventEndTime(drive) <= now ? "completed" : "upcoming",
  };
};

const ensureTipCategory = (category) => {
  if (!tipCategories.includes(category)) {
    throw new ApiError(
      422,
      `category must be one of: ${tipCategories.join(", ")}`,
    );
  }
};

export const listTips = async ({ category, page, limit }) => {
  const filter = category ? { category } : {};
  const skip = (page - 1) * limit;
  const [tips, total] = await Promise.all([
    Tip.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Tip.countDocuments(filter),
  ]);
  return {
    tips,
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

export const getTip = async (id) => {
  const tip = await Tip.findById(id).lean();
  if (!tip) throw new ApiError(404, "Tip not found");
  return tip;
};

export const createTip = async (data, createdBy) => {
  ensureTipCategory(data.category);
  return (await Tip.create({ ...data, createdBy })).toObject();
};

export const updateTip = async (id, updates) => {
  if (updates.category) ensureTipCategory(updates.category);
  const tip = await Tip.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });
  if (!tip) throw new ApiError(404, "Tip not found");
  return tip.toObject();
};

export const deleteTip = async (id) => {
  const tip = await Tip.findByIdAndDelete(id);
  if (!tip) throw new ApiError(404, "Tip not found");
};

export const listDrives = async ({ status, page, limit }, userId) => {
  const now = new Date();
  const eventFilter =
    status === "upcoming"
      ? {
          $or: [
            { date: { $gt: new Date(now.toISOString().slice(0, 10)) } },
            {
              date: new Date(now.toISOString().slice(0, 10)),
              endTime: {
                $gt: `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`,
              },
            },
          ],
        }
      : status === "completed"
        ? {
            $or: [
              { date: { $lt: new Date(now.toISOString().slice(0, 10)) } },
              {
                date: new Date(now.toISOString().slice(0, 10)),
                endTime: {
                  $lte: `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`,
                },
              },
            ],
          }
        : {};
  const skip = (page - 1) * limit;
  const [drives, total] = await Promise.all([
    Drive.find(eventFilter)
      .sort({ date: status === "completed" ? -1 : 1, startTime: 1, _id: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Drive.countDocuments(eventFilter),
  ]);
  return {
    drives: drives.map((drive) => withDriveStatus(drive, now, userId)),
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

export const getDrive = async (id, userId) => {
  const drive = await Drive.findById(id).lean();
  if (!drive) throw new ApiError(404, "Drive not found");
  return withDriveStatus(drive, new Date(), userId);
};

export const createDrive = async (data, createdBy) => {
  const drive = await Drive.create({ ...data, createdBy });
  return withDriveStatus(await Drive.findById(drive._id).lean());
};

export const updateDrive = async (id, updates) => {
  const filter = { _id: id };
  if (
    updates.maxParticipants !== undefined &&
    updates.maxParticipants !== null
  ) {
    filter.$expr = {
      $lte: [{ $size: "$participants" }, updates.maxParticipants],
    };
  }
  const drive = await Drive.findOneAndUpdate(filter, updates, {
    new: true,
    runValidators: true,
  }).lean();
  if (!drive) {
    const exists = await Drive.exists({ _id: id });
    if (!exists) throw new ApiError(404, "Drive not found");
    throw new ApiError(
      409,
      "Maximum participants cannot be lower than the current participant count",
    );
  }
  return withDriveStatus(drive);
};

export const deleteDrive = async (id) => {
  const drive = await Drive.findByIdAndDelete(id);
  if (!drive) throw new ApiError(404, "Drive not found");
};

export const joinDrive = async (id, userId) => {
  if (!mongoose.isValidObjectId(id))
    throw new ApiError(400, "Invalid drive identifier");
  const drive = await Drive.findById(id);
  if (!drive) throw new ApiError(404, "Drive not found");
  if (eventEndTime(drive) <= new Date())
    throw new ApiError(409, "Cannot join a drive that has already completed");
  if (drive.participants.some((participant) => participant.equals(userId))) {
    return getDrive(id, userId);
  }

  const updated = await Drive.findOneAndUpdate(
    {
      _id: id,
      participants: { $ne: new mongoose.Types.ObjectId(userId) },
      $expr: {
        $or: [
          { $eq: [{ $ifNull: ["$maxParticipants", null] }, null] },
          { $lt: [{ $size: "$participants" }, "$maxParticipants"] },
        ],
      },
    },
    { $addToSet: { participants: userId } },
    { new: true },
  );
  if (!updated) {
    const current = await Drive.findById(id).select(
      "participants maxParticipants",
    );
    if (!current) throw new ApiError(404, "Drive not found");
    if (current.participants.some((participant) => participant.equals(userId)))
      return getDrive(id, userId);
    throw new ApiError(409, "This drive is full");
  }
  return getDrive(id, userId);
};

export const leaveDrive = async (id, userId) => {
  if (!mongoose.isValidObjectId(id))
    throw new ApiError(400, "Invalid drive identifier");
  const drive = await Drive.findByIdAndUpdate(
    id,
    { $pull: { participants: userId } },
    { new: true },
  );
  if (!drive) throw new ApiError(404, "Drive not found");
  return getDrive(id, userId);
};
