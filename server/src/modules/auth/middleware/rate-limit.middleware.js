import rateLimit from 'express-rate-limit';

const baseOptions = {
  windowMs: 15 * 60 * 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many requests; please try again later',
  },
};

export const authRateLimiter = rateLimit({ ...baseOptions, limit: 20 });
export const passwordResetRateLimiter = rateLimit({ ...baseOptions, limit: 5 });
