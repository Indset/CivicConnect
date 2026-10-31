import mongoose from "mongoose";
import Joi from "joi";
import { ApiError } from "../../../utils/ApiError.js";

const categories = [
  "Cleanliness",
  "Traffic",
  "Water",
  "Noise",
  "Public property",
];
const locationSchema = Joi.object({
  address: Joi.string().trim().min(3).max(500).required(),
  coordinates: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
  })
    .unknown(false)
    .optional(),
}).unknown(false);
const optionalImageUrl = Joi.string()
  .uri({ scheme: ["http", "https"] })
  .max(2048)
  .allow("");
const driveFields = {
  title: Joi.string().trim().min(5).max(150),
  description: Joi.string().trim().min(20).max(5000),
  location: locationSchema,
  date: Joi.date().iso(),
  startTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/),
  organizer: Joi.string().trim().min(2).max(150),
  imageUrl: optionalImageUrl,
  maxParticipants: Joi.number().integer().min(1).allow(null),
};

const validateDriveTimes = (value, helpers) => {
  if (value.startTime && value.endTime && value.endTime <= value.startTime) {
    return helpers.error("any.invalid", {
      message: "endTime must be later than startTime",
    });
  }
  return value;
};

const validateDrive = (schema) =>
  schema
    .custom(validateDriveTimes, "drive time validation")
    .messages({ "any.invalid": "{{#message}}" });

export const createTipSchema = Joi.object({
  title: Joi.string().trim().min(5).max(150).required(),
  content: Joi.string().trim().min(20).max(5000).required(),
  category: Joi.string()
    .valid(...categories)
    .required(),
  imageUrl: optionalImageUrl.optional(),
}).unknown(false);

export const updateTipSchema = Joi.object({
  title: Joi.string().trim().min(5).max(150),
  content: Joi.string().trim().min(20).max(5000),
  category: Joi.string().valid(...categories),
  imageUrl: optionalImageUrl,
})
  .min(1)
  .unknown(false);

export const createDriveSchema = validateDrive(
  Joi.object({
    title: driveFields.title.required(),
    description: driveFields.description.required(),
    location: driveFields.location.required(),
    date: driveFields.date.required(),
    startTime: driveFields.startTime.required(),
    endTime: driveFields.endTime.required(),
    organizer: driveFields.organizer.required(),
    imageUrl: driveFields.imageUrl.optional(),
    maxParticipants: driveFields.maxParticipants.optional(),
  }).unknown(false),
);

export const updateDriveSchema = validateDrive(
  Joi.object(driveFields)
    .min(1)
    .with("startTime", "endTime")
    .with("endTime", "startTime")
    .unknown(false),
);

export const validateAwarenessId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return next(new ApiError(400, "Invalid awareness item identifier"));
  }
  return next();
};

export const validateAwarenessListQuery = (req, res, next) => {
  const allowed = req.path.endsWith("/tips")
    ? ["category", "page", "limit"]
    : ["status", "page", "limit"];
  const unknown = Object.keys(req.query).filter(
    (key) => !allowed.includes(key),
  );
  if (unknown.length) {
    return next(
      new ApiError(422, `Unsupported query parameters: ${unknown.join(", ")}`),
    );
  }
  const parsePositiveInteger = (value, defaultValue, field) => {
    if (value === undefined) return defaultValue;
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
      throw new ApiError(422, `${field} must be a positive integer`);
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed)) {
      throw new ApiError(422, `${field} must be a positive integer`);
    }
    return parsed;
  };
  let page;
  let limit;
  try {
    page = parsePositiveInteger(req.query.page, 1, "page");
    limit = parsePositiveInteger(req.query.limit, 12, "limit");
  } catch (error) {
    return next(error);
  }
  if (page < 1)
    return next(new ApiError(422, "page must be a positive integer"));
  if (limit > 100) {
    return next(new ApiError(422, "limit must be between 1 and 100"));
  }
  if (
    req.query.category !== undefined &&
    (typeof req.query.category !== "string" ||
      !categories.includes(req.query.category))
  ) {
    return next(
      new ApiError(422, `category must be one of: ${categories.join(", ")}`),
    );
  }
  if (
    req.query.status !== undefined &&
    (typeof req.query.status !== "string" ||
      !["upcoming", "completed"].includes(req.query.status))
  ) {
    return next(new ApiError(422, "status must be upcoming or completed"));
  }
  req.validatedQuery = {
    category: req.query.category,
    status: req.query.status,
    page,
    limit,
  };
  return next();
};

export const awarenessCategories = categories;
