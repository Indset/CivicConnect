import request from 'supertest';
import app from '../../src/app.js';

export const agent = request.agent(app);
export const requestApp = request(app);
