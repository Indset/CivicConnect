import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import compression from 'compression';
import env from '../../config/env.js';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, statusCode: 429, message: 'Too many authentication requests, please try again later' },
});

export const complaintRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, statusCode: 429, message: 'Too many complaint requests, please try again later' },
});

export const sanitizeMongoQueries = mongoSanitize();
export const preventXss = xss();
export const preventParameterPollution = hpp();
export const compressResponse = compression();

export const secureCookies = (req, res, next) => {
  if (!req.cookies?.access_token && !req.headers.authorization) return next();
  res.cookie('access_token', req.cookies?.access_token ?? '', {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.cookieSameSite,
    maxAge: env.jwtCookieExpiresDays * 24 * 60 * 60 * 1000,
  });
  return next();
};

export const setSecurityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  return next();
};
