import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { connectTestDatabase, disconnectTestDatabase } from './helpers/db.js';
import { requestApp } from './helpers/testApp.js';
import User from '../src/modules/auth/models/user.model.js';
import Notification from '../src/modules/notifications/models/notification.model.js';
import { signAccessToken } from '../src/modules/auth/utils/jwt.js';

describe('Notification API', () => {
  let user;
  let token;

  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Notification.deleteMany({});
    user = await User.create({
      fullName: 'Notification User',
      email: 'notify@example.com',
      phone: '+919444444444',
      password: 'StrongPass123!',
    });
    token = signAccessToken(user.id);
  });

  it('creates and lists notifications', async () => {
    const createResponse = await requestApp.post('/api/v1/notifications').set('Authorization', `Bearer ${token}`).send({
      user: user.id,
      title: 'System update',
      message: 'Your complaint has been received',
      type: 'complaint_created',
    });

    expect(createResponse.status).toBe(201);

    const listResponse = await requestApp.get('/api/v1/notifications').set('Authorization', `Bearer ${token}`);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.notifications).toHaveLength(1);
  });
});
