import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { connectTestDatabase, disconnectTestDatabase } from './helpers/db.js';
import { requestApp } from './helpers/testApp.js';
import User from '../src/modules/auth/models/user.model.js';
import Category from '../src/modules/categories/models/category.model.js';
import { signAccessToken } from '../src/modules/auth/utils/jwt.js';

describe('Category CRUD API', () => {
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
    const admin = await User.create({
      fullName: 'Admin User',
      email: 'admin@example.com',
      phone: '+919555555555',
      password: 'StrongPass123!',
      role: 'admin',
    });
    adminToken = signAccessToken(admin.id);
  });

  it('creates and updates a category', async () => {
    const createResponse = await requestApp.post('/api/v1/admin/categories').set('Authorization', `Bearer ${adminToken}`).send({
      name: 'Sanitation',
      description: 'Waste and sanitation issues',
    });

    expect(createResponse.status).toBe(201);
    const categoryId = createResponse.body.data.category._id;

    const updateResponse = await requestApp.patch(`/api/v1/admin/categories/${categoryId}`).set('Authorization', `Bearer ${adminToken}`).send({
      description: 'Updated description',
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.category.description).toBe('Updated description');
  });
});
