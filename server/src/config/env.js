import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '../..');
const projectRoot = path.resolve(serverRoot, '..');
const envFilePaths = [
  path.join(projectRoot, '.env'),
  path.join(serverRoot, '.env'),
];

const loadedEnvFiles = envFilePaths.filter((filePath) => {
  if (!fs.existsSync(filePath)) return false;
  const result = dotenv.config({ path: filePath, override: false });
  if (result.error) throw result.error;
  return true;
});

const getString = (name, fallback) => {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return value.trim();
};

const positiveInteger = (name, fallback) => {
  const value = getString(name);
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || String(parsed) !== value) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
};

const booleanValue = (name, fallback = false) => {
  const value = getString(name);
  if (value === undefined) return fallback;
  if (['true', '1', 'yes'].includes(value.toLowerCase())) return true;
  if (['false', '0', 'no'].includes(value.toLowerCase())) return false;
  throw new Error(`${name} must be true or false`);
};

const requireEnvironmentVariables = (names) => {
  const missing = names.filter((name) => !getString(name));
  if (missing.length === 0) return;

  const searchedPaths = envFilePaths.map((filePath) => path.relative(projectRoot, filePath)).join(', ');
  const loadedPaths = loadedEnvFiles.length
    ? loadedEnvFiles.map((filePath) => path.relative(projectRoot, filePath)).join(', ')
    : 'none';
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}. `
    + `Loaded env files: ${loadedPaths}. Searched: ${searchedPaths}. `
    + 'Create a root .env from .env.example, or set these variables in your deployment environment.',
  );
};

const decodeCredential = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const encodeCredential = (value) => encodeURIComponent(decodeCredential(value));

const normalizeMongoUri = (value) => {
  const uri = value.trim();
  if (uri.includes('<') || uri.includes('>')) {
    throw new Error('MONGO_URI still contains placeholder values. Replace them with real MongoDB credentials.');
  }
  if (!/^mongodb(?:\+srv)?:\/\//i.test(uri)) {
    throw new Error('MONGO_URI must start with mongodb:// or mongodb+srv://');
  }

  const protocolEnd = uri.indexOf('://') + 3;
  const protocol = uri.slice(0, protocolEnd);
  const remainder = uri.slice(protocolEnd);
  const authSeparator = remainder.lastIndexOf('@');
  const normalizedUri = authSeparator === -1
    ? uri
    : (() => {
      const credentials = remainder.slice(0, authSeparator);
      const hostAndOptions = remainder.slice(authSeparator + 1);
      const passwordSeparator = credentials.indexOf(':');
      if (passwordSeparator === -1) return uri;
      const username = credentials.slice(0, passwordSeparator);
      const password = credentials.slice(passwordSeparator + 1);
      if (!username || !password || !hostAndOptions) return uri;
      return `${protocol}${encodeCredential(username)}:${encodeCredential(password)}@${hostAndOptions}`;
    })();

  try {
    const parsed = new URL(normalizedUri);
    if (!parsed.hostname) throw new Error('missing hostname');
    return normalizedUri;
  } catch (error) {
    throw new Error(
      `MONGO_URI is not a valid MongoDB connection string. `
      + `If the username or password contains @, #, %, ?, or /, percent-encode it. Details: ${error.message}`,
    );
  }
};

requireEnvironmentVariables(['MONGO_URI', 'JWT_SECRET']);

const nodeEnv = getString('NODE_ENV', 'development');
if (!['development', 'test', 'production'].includes(nodeEnv)) {
  throw new Error('NODE_ENV must be development, test, or production');
}

const jwtSecret = getString('JWT_SECRET');
if (jwtSecret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
if (nodeEnv === 'production' && jwtSecret.length < 64) {
  throw new Error('JWT_SECRET must contain at least 64 characters in production');
}

const cookieSameSite = getString('COOKIE_SAME_SITE', nodeEnv === 'production' ? 'none' : 'lax').toLowerCase();
if (!['strict', 'lax', 'none'].includes(cookieSameSite)) {
  throw new Error('COOKIE_SAME_SITE must be strict, lax, or none');
}

const splitCsv = (value) => value
  .split(',')
  .map((item) => item.trim().replace(/\/$/, ''))
  .filter(Boolean);

const smtp = {
  host: getString('SMTP_HOST'),
  port: positiveInteger('SMTP_PORT', 587),
  secure: booleanValue('SMTP_SECURE', false),
  user: getString('SMTP_USER'),
  password: getString('SMTP_PASSWORD'),
  from: getString('EMAIL_FROM'),
};
smtp.configured = Boolean(smtp.host && smtp.user && smtp.password && smtp.from);
if (nodeEnv === 'production' && !smtp.configured) {
  throw new Error('SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM are required in production');
}

const cloudinary = {
  cloudName: getString('CLOUDINARY_CLOUD_NAME'),
  apiKey: getString('CLOUDINARY_API_KEY'),
  apiSecret: getString('CLOUDINARY_API_SECRET'),
};
cloudinary.configured = Boolean(cloudinary.cloudName && cloudinary.apiKey && cloudinary.apiSecret);
if (nodeEnv === 'production' && !cloudinary.configured) {
  throw new Error('CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are required in production');
}

export default Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: positiveInteger('PORT', 5000),
  mongoUri: normalizeMongoUri(getString('MONGO_URI')),
  corsOrigins: splitCsv(getString('CORS_ORIGINS', 'http://localhost:5173')),
  clientUrl: getString('CLIENT_URL', 'http://localhost:5173').replace(/\/$/, ''),
  requestBodyLimit: getString('REQUEST_BODY_LIMIT', '1mb'),
  shutdownTimeoutMs: positiveInteger('SHUTDOWN_TIMEOUT_MS', 10000),
  trustProxy: booleanValue('TRUST_PROXY', nodeEnv === 'production') ? 1 : false,
  jwtSecret,
  jwtExpiresIn: getString('JWT_EXPIRES_IN', '1d'),
  jwtCookieExpiresDays: positiveInteger('JWT_COOKIE_EXPIRES_DAYS', 1),
  cookieSameSite,
  smtp: Object.freeze(smtp),
  cloudinary: Object.freeze(cloudinary),
  loadedEnvFiles: Object.freeze(loadedEnvFiles),
});
