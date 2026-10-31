import { beforeAll, afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { connectTestDatabase, disconnectTestDatabase } from './helpers/db.js';
import { requestApp } from './helpers/testApp.js';
import User from '../src/modules/auth/models/user.model.js';

describe('Authentication API', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('registers a new user and returns auth cookies', async () => {
    const response = await requestApp.post('/api/v1/auth/register').send({
      fullName: 'Test User',
      email: 'test@example.com',
      phone: '+919999999999',
      password: 'StrongPass123!',
      confirmPassword: 'StrongPass123!',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('test@example.com');
    expect(response.headers['set-cookie'][0]).toContain('access_token=');
  });

  it('logs in an existing user', async () => {
    await User.create({
      fullName: 'Login User',
      email: 'login@example.com',
      phone: '+919888888888',
      password: 'StrongPass123!',
    });

    const response = await requestApp.post('/api/v1/auth/login').send({
      email: 'login@example.com',
      password: 'StrongPass123!',
    });

    expect(response.status).toBe(200);
    expect(response.body.data.token).toBeDefined();
    expect(response.body.data.user.email).toBe('login@example.com');
    expect(response.headers['set-cookie'][0]).toContain('access_token=');

    const currentUserResponse = await requestApp.get('/api/v1/auth/me').set('Cookie', response.headers['set-cookie'][0].split(';')[0]);

    expect(currentUserResponse.status).toBe(200);
    expect(currentUserResponse.body.data.user.email).toBe('login@example.com');
  });

  it('logs out a signed-in user', async () => {
    const user = await User.create({
      fullName: 'Logout User',
      email: 'logout@example.com',
      phone: '+919777777777',
      password: 'StrongPass123!',
    });

    const token = user.createPasswordResetToken();
    const sign = (await import('../src/modules/auth/utils/jwt.js')).signAccessToken;
    const authToken = sign(user.id);

    const response = await requestApp.post('/api/v1/auth/logout').set('Cookie', [`access_token=${authToken}`]);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Logout successful');
  });
});
