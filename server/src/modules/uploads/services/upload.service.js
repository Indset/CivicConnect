import stream from 'node:stream';
import { configureCloudinary } from '../../../config/cloudinary.js';
import { ApiError } from '../../../utils/ApiError.js';

const buildUploadOptions = (folder) => ({
  folder,
  resource_type: 'image',
  transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  use_filename: true,
  unique_filename: true,
});

const uploadBufferToCloudinary = (buffer, folder, publicId) => {
  return new Promise((resolve, reject) => {
    const configuredCloudinary = configureCloudinary();
    const uploadStream = configuredCloudinary.uploader.upload_stream(
      {
        ...buildUploadOptions(folder),
        ...(publicId ? { public_id: publicId } : {}),
      },
      (error, result) => {
        if (error) return reject(new ApiError(502, 'Image upload failed', [], { cause: error }));
        if (!result) return reject(new ApiError(502, 'Image upload failed'));
        return resolve(result);
      },
    );

    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    bufferStream.pipe(uploadStream);
  });
};

export const uploadSingleImageToCloudinary = async (file, folder = 'civicconnect/uploads') => {
  if (!file?.buffer?.length) throw new ApiError(400, 'No image file provided');
  const result = await uploadBufferToCloudinary(file.buffer, folder);
  return {
    url: result.secure_url,
    publicId: result.public_id,
    format: result.format,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
  };
};

export const uploadMultipleImagesToCloudinary = async (files, folder = 'civicconnect/uploads') => {
  if (!Array.isArray(files) || files.length === 0) throw new ApiError(400, 'No image files provided');
  const uploads = await Promise.allSettled(files.map((file) => uploadSingleImageToCloudinary(file, folder)));
  const completed = uploads.filter((result) => result.status === 'fulfilled').map((result) => result.value);
  const failed = uploads.find((result) => result.status === 'rejected');
  if (failed) {
    try {
      const cleanupResults = await deleteUnusedImages(completed.map((image) => image.publicId));
      if (cleanupResults.some((result) => !result)) {
        throw new Error('One or more uploaded images could not be deleted');
      }
    } catch (error) {
      throw new ApiError(502, 'Image upload failed and cleanup was incomplete', [], { cause: error });
    }
    throw failed.reason;
  }
  return completed;
};

export const deleteImageFromCloudinary = async (publicId) => {
  if (!publicId) return false;
  try {
    const configuredCloudinary = configureCloudinary();
    const result = await configuredCloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    return result?.result === 'ok' || result?.result === 'not found';
  } catch (error) {
    throw new ApiError(502, 'Image deletion failed', [], { cause: error });
  }
};

export const replaceImageInCloudinary = async (file, publicId, folder = 'civicconnect/uploads') => {
  if (!file?.buffer?.length) throw new ApiError(400, 'No image file provided');
  const result = await uploadBufferToCloudinary(file.buffer, folder, publicId);
  return {
    url: result.secure_url,
    publicId: result.public_id,
    format: result.format,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
  };
};

export const deleteUnusedImages = async (publicIds = []) => {
  if (!Array.isArray(publicIds) || publicIds.length === 0) return [];
  const results = await Promise.all(publicIds.map((publicId) => deleteImageFromCloudinary(publicId)));
  return results;
};
