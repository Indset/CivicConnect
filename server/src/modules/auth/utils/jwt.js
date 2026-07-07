import jwt from 'jsonwebtoken';
import env from '../../../config/env.js';

export const signAccessToken = (userId) => jwt.sign(
  { sub: userId }, env.jwtSecret,
  { expiresIn: env.jwtExpiresIn, issuer: 'civicconnect-api', audience: 'civicconnect-client' },
);
export const verifyAccessToken = (token) => jwt.verify(token, env.jwtSecret, {
  issuer: 'civicconnect-api', audience: 'civicconnect-client',
});
export const authCookieOptions = Object.freeze({
  httpOnly: true,
  secure: env.isProduction,
  sameSite: env.cookieSameSite,
  maxAge: env.jwtCookieExpiresDays * 24 * 60 * 60 * 1000,
  path: '/',
});
