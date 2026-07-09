import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import winston from 'winston';
import env from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDirectory = path.join(__dirname, '../../logs');
fs.mkdirSync(logDirectory, { recursive: true });

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  const stackInfo = stack ? `\n${stack}` : '';
  return `${timestamp} [${level.toUpperCase()}]: ${message}${stackInfo}`;
});

const logger = winston.createLogger({
  level: env.isProduction ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    env.isProduction ? logFormat : combine(colorize(), logFormat),
  ),
  transports: [
    new winston.transports.File({ filename: path.join(logDirectory, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logDirectory, 'combined.log') }),
    new winston.transports.Console({
      format: combine(colorize(), logFormat),
    }),
  ],
});

export const httpLogger = winston.createLogger({
  level: 'info',
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), printf(({ message, timestamp }) => `${timestamp} ${message}`)),
  transports: [
    new winston.transports.File({ filename: path.join(logDirectory, 'combined.log') }),
    new winston.transports.Console({ format: printf(({ message }) => message) }),
  ],
});

export default logger;
