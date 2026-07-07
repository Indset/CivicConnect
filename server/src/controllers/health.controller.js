import mongoose from 'mongoose';
import { ApiResponse } from '../utils/ApiResponse.js';

export const getHealth = (req, res) => {
  const databaseStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const data = {
    status: 'healthy',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: databaseStates[mongoose.connection.readyState] ?? 'unknown',
  };
  return res.status(200).json(new ApiResponse(200, data, 'CivicConnect API is healthy'));
};
