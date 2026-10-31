import { ApiResponse } from "../../../utils/ApiResponse.js";
import {
  createDrive,
  createTip,
  deleteDrive,
  deleteTip,
  getDrive,
  getTip,
  joinDrive,
  leaveDrive,
  listDrives,
  listTips,
  updateDrive,
  updateTip,
} from "../services/awareness.service.js";

export const listTipsHandler = async (req, res) => {
  const result = await listTips(req.validatedQuery);
  return res
    .status(200)
    .json(
      new ApiResponse(200, result, "Awareness tips retrieved successfully"),
    );
};

export const getTipHandler = async (req, res) => {
  const tip = await getTip(req.params.id);
  return res
    .status(200)
    .json(
      new ApiResponse(200, { tip }, "Awareness tip retrieved successfully"),
    );
};

export const createTipHandler = async (req, res) => {
  const tip = await createTip(req.validatedBody, req.user.id);
  return res
    .status(201)
    .json(new ApiResponse(201, { tip }, "Awareness tip created successfully"));
};

export const updateTipHandler = async (req, res) => {
  const tip = await updateTip(req.params.id, req.validatedBody);
  return res
    .status(200)
    .json(new ApiResponse(200, { tip }, "Awareness tip updated successfully"));
};

export const deleteTipHandler = async (req, res) => {
  await deleteTip(req.params.id);
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Awareness tip deleted successfully"));
};

export const listDrivesHandler = async (req, res) => {
  const result = await listDrives(req.validatedQuery, req.user?.id);
  return res
    .status(200)
    .json(
      new ApiResponse(200, result, "Cleanliness drives retrieved successfully"),
    );
};

export const getDriveHandler = async (req, res) => {
  const drive = await getDrive(req.params.id, req.user?.id);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { drive },
        "Cleanliness drive retrieved successfully",
      ),
    );
};

export const createDriveHandler = async (req, res) => {
  const drive = await createDrive(req.validatedBody, req.user.id);
  return res
    .status(201)
    .json(
      new ApiResponse(201, { drive }, "Cleanliness drive created successfully"),
    );
};

export const updateDriveHandler = async (req, res) => {
  const drive = await updateDrive(req.params.id, req.validatedBody);
  return res
    .status(200)
    .json(
      new ApiResponse(200, { drive }, "Cleanliness drive updated successfully"),
    );
};

export const deleteDriveHandler = async (req, res) => {
  await deleteDrive(req.params.id);
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Cleanliness drive deleted successfully"));
};

export const joinDriveHandler = async (req, res) => {
  const drive = await joinDrive(req.params.id, req.user.id);
  return res
    .status(200)
    .json(
      new ApiResponse(200, { drive }, "Joined cleanliness drive successfully"),
    );
};

export const leaveDriveHandler = async (req, res) => {
  const drive = await leaveDrive(req.params.id, req.user.id);
  return res
    .status(200)
    .json(
      new ApiResponse(200, { drive }, "Left cleanliness drive successfully"),
    );
};
