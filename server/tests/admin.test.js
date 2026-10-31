import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { connectTestDatabase, disconnectTestDatabase } from './helpers/db.js';
import { requestApp } from './helpers/testApp.js';
import User from '../src/modules/auth/models/user.model.js';
import Category from '../src/modules/categories/models/category.model.js';
import Complaint from '../src/modules/complaints/models/complaint.model.js';
import Notification from '../src/modules/notifications/models/notification.model.js';
import { signAccessToken } from '../src/modules/auth/utils/jwt.js';

describe('Admin API', () => {
  let admin;
  let adminToken;
  let owner;
  let ownerToken;
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
    await Notification.deleteMany({});
    admin = await User.create({
      fullName: 'Admin User',
      email: 'admin2@example.com',
      phone: '+919333333333',
      password: 'StrongPass123!',
      role: 'admin',
    });
    adminToken = signAccessToken(admin.id);
    owner = await User.create({
      fullName: 'Complaint Owner',
      email: 'complaint-owner@example.com',
      phone: '+919222222222',
      password: 'StrongPass123!',
    });
    ownerToken = signAccessToken(owner.id);
    category = await Category.create({ name: 'Roads', description: 'Road issues' });
  });

  it('returns the admin dashboard', async () => {
    const response = await requestApp.get('/api/v1/admin/dashboard').set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data.dashboard.totalUsers).toBe(2);
  });

  it('records status history and notifies the complaint owner', async () => {
    const complaint = await Complaint.create({
      user: owner.id,
      category: category.id,
      title: 'Broken streetlight',
      description: 'The streetlight beside the public park has been broken for several days.',
      location: 'Park Road',
    });

    const response = await requestApp
      .patch(`/api/v1/admin/complaints/${complaint.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'in_progress', note: 'A repair crew has been assigned.' });

    expect(response.status).toBe(200);
    expect(response.body.data.complaint.statusHistory).toHaveLength(1);
    expect(response.body.data.complaint.statusHistory[0]).toMatchObject({
      status: 'in_progress',
      note: 'A repair crew has been assigned.',
      changedBy: admin.id,
    });

    const notification = await Notification.findOne({ user: owner.id, complaint: complaint.id });
    expect(notification).toMatchObject({
      type: 'complaint_status',
      title: 'Complaint status updated',
    });
    expect(notification.message).toContain('In Progress');
    expect(notification.message).toContain('A repair crew has been assigned.');

    const ownerView = await requestApp
      .get(`/api/v1/complaints/${complaint.id}`)
      .set('Cookie', `access_token=${ownerToken}`);
    expect(ownerView.body.data.complaint.statusHistory).toHaveLength(1);
  });

  it('rejects invalid complaint status transitions', async () => {
    const complaint = await Complaint.create({
      user: owner.id,
      category: category.id,
      title: 'Resolved streetlight',
      description: 'The broken streetlight has already been repaired by the city maintenance team.',
      location: 'Library Road',
      status: 'resolved',
    });

    const response = await requestApp
      .patch(`/api/v1/admin/complaints/${complaint.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'submitted' });

    expect(response.status).toBe(409);
    expect(await Notification.countDocuments({ complaint: complaint.id })).toBe(0);
  });

  it('records assignment as a status change and notifies the owner', async () => {
    const complaint = await Complaint.create({
      user: owner.id,
      category: category.id,
      title: 'Blocked storm drain',
      description: 'The storm drain on the east side of the square is blocked and flooding the street.',
      location: 'Town Square',
    });

    const response = await requestApp
      .post(`/api/v1/admin/complaints/${complaint.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedTo: admin.id });

    expect(response.status).toBe(200);
    expect(response.body.data.complaint.statusHistory).toHaveLength(1);
    expect(response.body.data.complaint.statusHistory[0]).toMatchObject({
      status: 'assigned',
      changedBy: admin.id,
    });
    expect(await Notification.countDocuments({
      user: owner.id,
      complaint: complaint.id,
      type: 'complaint_status',
    })).toBe(1);
  });
});
