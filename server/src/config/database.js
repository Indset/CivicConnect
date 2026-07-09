import mongoose from 'mongoose';
import env from './env.js';
import logger from '../utils/logger.js';

mongoose.set('strictQuery', true);

mongoose.connection.on('error', (error) => {
  logger.error('MongoDB connection error', { message: error.message });
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
});

const getConnectionHint = (error) => {
  if (error.message?.includes('querySrv')) {
    return 'MongoDB Atlas SRV lookup failed. Check internet/DNS access, the cluster hostname, and that Render or your current IP can reach Atlas.';
  }
  if (error.message?.includes('bad auth') || error.message?.includes('Authentication failed')) {
    return 'MongoDB authentication failed. Check the Atlas database username and password in MONGO_URI.';
  }
  if (error.message?.includes('IP') || error.message?.includes('whitelist')) {
    return 'MongoDB Atlas rejected the network source. Add your current IP or Render outbound access to Atlas Network Access.';
  }
  return 'MongoDB connection failed. Verify MONGO_URI, Atlas network access, and database user permissions.';
};

export const connectDatabase = async () => {
  try {
    const connection = await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
    });
    console.log('MongoDB Connected');
    logger.info(`MongoDB host: ${connection.connection.host}`);
    return connection;
  } catch (error) {
    logger.error(getConnectionHint(error));
    throw error;
  }
};

export const disconnectDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  }
};
