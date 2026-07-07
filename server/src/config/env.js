import dotenv from 'dotenv';
dotenv.config();

const required = ['MONGO_URI', 'JWT_SECRET'];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
if (process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');

const positiveInteger = (value, fallback, name) => {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
  return parsed;
};

const nodeEnv = process.env.NODE_ENV ?? 'development';
const cookieSameSite = process.env.COOKIE_SAME_SITE ?? 'lax';
if (!['development', 'test', 'production'].includes(nodeEnv)) throw new Error('NODE_ENV must be development, test, or production');
if (!['strict', 'lax', 'none'].includes(cookieSameSite)) throw new Error('COOKIE_SAME_SITE must be strict, lax, or none');

const smtp = {
  host: process.env.SMTP_HOST,
  port: positiveInteger(process.env.SMTP_PORT, 587, 'SMTP_PORT'),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER,
  password: process.env.SMTP_PASSWORD,
  from: process.env.EMAIL_FROM,
};
smtp.configured = Boolean(smtp.host && smtp.user && smtp.password && smtp.from);
if (nodeEnv === 'production' && !smtp.configured) throw new Error('SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM are required in production');

export default Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: positiveInteger(process.env.PORT, 5000, 'PORT'),
  mongoUri: process.env.MONGO_URI,
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(',').map((item) => item.trim()).filter(Boolean),
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  requestBodyLimit: process.env.REQUEST_BODY_LIMIT ?? '1mb',
  shutdownTimeoutMs: positiveInteger(process.env.SHUTDOWN_TIMEOUT_MS, 10000, 'SHUTDOWN_TIMEOUT_MS'),
  trustProxy: process.env.TRUST_PROXY === 'true' ? 1 : false,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  jwtCookieExpiresDays: positiveInteger(process.env.JWT_COOKIE_EXPIRES_DAYS, 1, 'JWT_COOKIE_EXPIRES_DAYS'),
  cookieSameSite,
  smtp: Object.freeze(smtp),
});
