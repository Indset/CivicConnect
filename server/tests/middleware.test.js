import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { connectTestDatabase, disconnectTestDatabase } from './helpers/db.js';
import { requestApp } from './helpers/testApp.js';
import User from '../src/modules/auth/models/user.model.js';
import { signAccessToken } from '../src/modules/auth/utils/jwt.js';

describe('Middleware and error handling', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('returns 401 for missing authentication', async () => {
    const response = await requestApp.get('/api/v1/complaints');
    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Authentication required');
  });

  it('returns 403 for unauthorized admin access', async () => {
    const user = await User.create({
      fullName: 'Citizen User',
      email: 'citizen@example.com',
      phone: '+919222222222',
      password: 'StrongPass123!',
    });
    const token = signAccessToken(user.id);
    const response = await requestApp.get('/api/v1/admin/dashboard').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Admin access required');
  });

  it('returns 422 for validation errors', async () => {
    const response = await requestApp.post('/api/v1/auth/register').send({
      fullName: 'Bad',
      email: 'not-an-email',
      phone: '123',
      password: 'pass',
      confirmPassword: 'different',
    });
    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
  });

  it('returns 404 for unknown routes', async () => {
    const response = await requestApp.get('/api/v1/does-not-exist');
    expect(response.status).toBe(404);
  });
});
