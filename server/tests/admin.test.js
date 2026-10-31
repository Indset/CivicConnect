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

  it('returns aggregated analytics for a requested period', async () => {
    const parks = await Category.create({ name: 'Parks', description: 'Public park issues' });
    const olderDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    await Complaint.create({
      user: owner.id,
      category: category.id,
      title: 'Resolved streetlight',
      description: 'The broken streetlight beside the public park has been repaired by city workers.',
      location: 'Park Road, Ward 4',
      status: 'resolved',
      upvoteCount: 12,
      createdAt: olderDate,
      updatedAt: new Date(olderDate.getTime() + 36 * 60 * 60 * 1000),
      statusHistory: [
        { status: 'submitted', changedBy: owner.id, changedAt: olderDate },
        { status: 'resolved', note: 'Repaired', changedBy: admin.id, changedAt: new Date(olderDate.getTime() + 36 * 60 * 60 * 1000) },
      ],
    });
    await Complaint.create({
      user: owner.id,
      category: parks.id,
      title: 'Broken park entrance gate',
      description: 'The entrance gate to the central park is broken and cannot be securely closed.',
      location: { address: 'Central Park, Ward 2' },
      status: 'in_progress',
    });

    const response = await requestApp
      .get('/api/v1/admin/analytics?range=30d')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.analytics).toMatchObject({
      range: '30d',
      totals: { total: 2, pending: 0, inProgress: 1, resolved: 1 },
      averageResolutionTime: { hours: 36, days: 1.5, count: 1 },
    });
    expect(response.body.data.analytics.statusCounts).toEqual(expect.arrayContaining([
      { status: 'resolved', count: 1 },
      { status: 'in_progress', count: 1 },
    ]));
    expect(response.body.data.analytics.categoryCounts).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Roads', count: 1 }),
      expect.objectContaining({ name: 'Parks', count: 1 }),
    ]));
    expect(response.body.data.analytics.trend).toHaveLength(2);
    expect(response.body.data.analytics.topUpvoted[0]).toMatchObject({ upvoteCount: 12 });
    expect(response.body.data.analytics.areaCounts).toEqual(expect.arrayContaining([
      { area: 'Park Road, Ward 4', count: 1 },
      { area: 'Central Park, Ward 2', count: 1 },
    ]));
  });

  it('rejects unsupported analytics ranges', async () => {
    const response = await requestApp
      .get('/api/v1/admin/analytics?range=90d')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(422);
  });

  it('restricts analytics to administrators', async () => {
    const response = await requestApp
      .get('/api/v1/admin/analytics?range=7d')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(response.status).toBe(403);
  });
});
