import { v2 as cloudinary } from 'cloudinary';
import env from './env.js';

let configured = false;

export const configureCloudinary = () => {
  if (!env.cloudinary.configured) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
  }

  if (!configured) {
    cloudinary.config({
      cloud_name: env.cloudinary.cloudName,
      api_key: env.cloudinary.apiKey,
      api_secret: env.cloudinary.apiSecret,
      secure: true,
    });
    configured = true;
  }

  return cloudinary;
};

export { cloudinary };
