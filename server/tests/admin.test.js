import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { connectTestDatabase, disconnectTestDatabase } from './helpers/db.js';
import { requestApp } from './helpers/testApp.js';
import User from '../src/modules/auth/models/user.model.js';
import Category from '../src/modules/categories/models/category.model.js';
import Complaint from '../src/modules/complaints/models/complaint.model.js';
import { signAccessToken } from '../src/modules/auth/utils/jwt.js';

describe('Admin API', () => {
  let adminToken;

  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Category.deleteMany({});
    await Complaint.deleteMany({});
    const admin = await User.create({
      fullName: 'Admin User',
      email: 'admin2@example.com',
      phone: '+919333333333',
      password: 'StrongPass123!',
      role: 'admin',
    });
    adminToken = signAccessToken(admin.id);
  });

  it('returns the admin dashboard', async () => {
    const response = await requestApp.get('/api/v1/admin/dashboard').set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data.dashboard.totalUsers).toBe(1);
  });
});
