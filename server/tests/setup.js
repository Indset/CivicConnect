import { jest } from '@jest/globals';
import dotenv from 'dotenv';

dotenv.config();

process.env.NODE_ENV = 'test';
process.env.MONGOMS_VERSION = process.env.MONGOMS_VERSION ?? '7.0.5';
process.env.MONGO_URI = process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/civicconnect-test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? '12345678901234567890123456789012';
process.env.CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME ?? 'demo';
process.env.CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY ?? 'demo';
process.env.CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET ?? 'demo';

jest.setTimeout(60000);
