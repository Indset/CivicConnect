import swaggerJsdoc from 'swagger-jsdoc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { swaggerSchemas } from './schemas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'CivicConnect API',
      version: '1.0.0',
      description: 'Complete API documentation for the CivicConnect complaint management platform.',
    },
    servers: [
      { url: '/api/v1', description: 'API server' },
    ],
    tags: [
      { name: 'Auth', description: 'Authentication and profile endpoints' },
      { name: 'Complaints', description: 'Complaint lifecycle endpoints' },
      { name: 'Categories', description: 'Complaint category management' },
      { name: 'Notifications', description: 'User notification management' },
      { name: 'Admin', description: 'Administrative operations' },
      { name: 'Uploads', description: 'Image upload management' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      ...swaggerSchemas,
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [path.join(__dirname, '../modules/**/*.js')],
};

export const swaggerSpec = swaggerJsdoc(options);
export const swaggerUiConfig = {
  customSiteTitle: 'CivicConnect API Docs',
  customfavIcon: '/favicon.ico',
};
