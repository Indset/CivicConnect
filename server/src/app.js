import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import env from './config/env.js';
import { ApiError } from './utils/ApiError.js';
import { errorHandler, notFoundHandler } from './utils/errorHandler.js';
import logger, { httpLogger } from './utils/logger.js';
import {
  complaintRateLimiter,
  compressResponse,
  preventParameterPollution,
  preventXss,
  sanitizeMongoQueries,
  secureCookies,
  setSecurityHeaders,
} from './middlewares/security/security.middleware.js';
import healthRouter from './routes/health.routes.js';
import authRouter from './modules/auth/routes/auth.routes.js';
import complaintRouter from './modules/complaints/routes/complaint.routes.js';
import adminRouter from './modules/admin/routes/admin.routes.js';
import uploadRouter from './modules/uploads/routes/upload.routes.js';
import notificationRouter from './modules/notifications/routes/notification.routes.js';
import categoryRouter from './modules/categories/routes/category.routes.js';
import swaggerRouter from './docs/swagger.routes.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', env.trustProxy);
app.use(helmet({
  contentSecurityPolicy: env.isProduction,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(setSecurityHeaders);
app.use(compressResponse);
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
    return callback(new ApiError(403, 'Origin is not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan(env.isProduction ? 'combined' : 'dev', {
  stream: {
    write: (message) => httpLogger.info(message.trim()),
  },
}));
app.use(express.json({ limit: env.requestBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: env.requestBodyLimit }));
app.use(cookieParser());
app.use(sanitizeMongoQueries);
app.use(preventXss);
app.use(preventParameterPollution);
app.use(secureCookies);

app.use('/api/v1/health', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/complaints', complaintRateLimiter, complaintRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/uploads', uploadRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/categories', categoryRouter);
app.use('/api/docs', swaggerRouter);

app.use(notFoundHandler);
app.use(errorHandler);
export default app;
