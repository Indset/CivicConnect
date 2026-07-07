import mongoose from 'mongoose';
import env from './env.js';

mongoose.set('strictQuery', true);

export const connectDatabase = async () => {
  const connection = await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log(`MongoDB connected: ${connection.connection.host}`);
  return connection;
};

export const disconnectDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
};
