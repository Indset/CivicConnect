import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { connectTestDatabase, disconnectTestDatabase } from './helpers/db.js';
import { requestApp } from './helpers/testApp.js';
import User from '../src/modules/auth/models/user.model.js';
import Category from '../src/modules/categories/models/category.model.js';
import Complaint from '../src/modules/complaints/models/complaint.model.js';
import { signAccessToken } from '../src/modules/auth/utils/jwt.js';

describe('Complaint CRUD API', () => {
  let user;
  let token;
  let category;

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

    user = await User.create({
      fullName: 'Complaint User',
      email: 'complaint@example.com',
      phone: '+919666666666',
      password: 'StrongPass123!',
    });
    token = signAccessToken(user.id);
    category = await Category.create({ name: 'Roads', description: 'Road issues' });
  });

  it('creates a complaint', async () => {
    const response = await requestApp.post('/api/v1/complaints').set('Authorization', `Bearer ${token}`).send({
      category: category.id,
      title: 'Broken streetlight',
      description: 'The streetlight near the park is broken and needs replacement.',
      location: 'Main Road',
      priority: 'high',
    });

    expect(response.status).toBe(201);
    expect(response.body.data.complaint.title).toBe('Broken streetlight');
  });

  it('lists and updates a complaint', async () => {
    const complaint = await Complaint.create({
      user: user.id,
      category: category.id,
      title: 'Pothole issue',
      description: 'The pothole near the school entrance is worsening rapidly.',
      location: 'School Road',
    });

    const listResponse = await requestApp.get('/api/v1/complaints').set('Authorization', `Bearer ${token}`);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.complaints).toHaveLength(1);

    const updateResponse = await requestApp.put(`/api/v1/complaints/${complaint.id}`).set('Authorization', `Bearer ${token}`).send({
      title: 'Pothole issue updated',
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.complaint.title).toBe('Pothole issue updated');
  });

  it('deletes a complaint', async () => {
    const complaint = await Complaint.create({
      user: user.id,
      category: category.id,
      title: 'Water leakage',
      description: 'Water leakage near the apartment building is causing issues.',
      location: 'Block C',
    });

    const response = await requestApp.delete(`/api/v1/complaints/${complaint.id}`).set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(await Complaint.countDocuments()).toBe(0);
  });
});
