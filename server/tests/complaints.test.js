import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import mongoose from 'mongoose';
import { connectTestDatabase, disconnectTestDatabase } from './helpers/db.js';
import { requestApp } from './helpers/testApp.js';
import User from '../src/modules/auth/models/user.model.js';
import Category from '../src/modules/categories/models/category.model.js';
import Complaint from '../src/modules/complaints/models/complaint.model.js';
import Notification from '../src/modules/notifications/models/notification.model.js';
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
    await Notification.deleteMany({});

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
    expect(response.body.data.complaint.statusHistory).toHaveLength(1);
    expect(response.body.data.complaint.statusHistory[0]).toMatchObject({
      status: 'submitted',
      note: 'Complaint submitted',
      changedBy: user.id,
    });
  });

  it('creates a complaint with structured location while retaining plain-text compatibility', async () => {
    const response = await requestApp.post('/api/v1/complaints').set('Cookie', `access_token=${token}`).send({
      category: category.id,
      title: 'Blocked drainage',
      description: 'The storm drain is blocked and water is pooling across the road.',
      location: { address: 'Central Market, Ward 4', coordinates: { lat: 28.6139, lng: 77.209 } },
    });

    expect(response.status).toBe(201);
    expect(response.body.data.complaint.location).toEqual({
      address: 'Central Market, Ward 4',
      coordinates: { lat: 28.6139, lng: 77.209 },
    });
  });

  it('parses structured locations from multipart form data without requiring images', async () => {
    const response = await requestApp
      .post('/api/v1/complaints')
      .set('Cookie', `access_token=${token}`)
      .field('category', category.id)
      .field('title', 'Damaged traffic signal')
      .field('description', 'The traffic signal at the junction is damaged and not working correctly.')
      .field('location', JSON.stringify({ address: 'Central Junction' }))
      .field('priority', 'medium');

    expect(response.status).toBe(201);
    expect(response.body.data.complaint.location).toEqual({ address: 'Central Junction' });
  });

  it('rejects unsupported image types before attempting an upload', async () => {
    const response = await requestApp
      .post('/api/v1/complaints')
      .set('Cookie', `access_token=${token}`)
      .attach('images', Buffer.from('not an image'), {
        filename: 'report.gif',
        contentType: 'image/gif',
      });

    expect(response.status).toBe(422);
  });

  it('rejects image files with unsupported content', async () => {
    const response = await requestApp
      .post('/api/v1/complaints')
      .set('Cookie', `access_token=${token}`)
      .attach('images', Buffer.from('not a PNG'), {
        filename: 'report.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(422);
  });

  it('rejects image files larger than 5 MB', async () => {
    const response = await requestApp
      .post('/api/v1/complaints')
      .set('Cookie', `access_token=${token}`)
      .attach('images', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'report.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(413);
  });

  it('limits complaint image uploads to four files', async () => {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    let request = requestApp.post('/api/v1/complaints').set('Cookie', `access_token=${token}`);
    for (let index = 0; index < 5; index += 1) {
      request = request.attach('images', pngHeader, {
        filename: `report-${index}.png`,
        contentType: 'image/png',
      });
    }

    const response = await request;
    expect(response.status).toBe(413);
  });

  it('toggles upvotes atomically and keeps the count synchronized', async () => {
    const complaint = await Complaint.create({
      user: user.id,
      category: category.id,
      title: 'Broken public bench',
      description: 'The public bench near the park entrance is broken and unsafe to use.',
      location: 'Park Entrance',
    });

    const [first, second] = await Promise.all([
      requestApp.post(`/api/v1/complaints/${complaint.id}/upvote`).set('Cookie', `access_token=${token}`),
      requestApp.post(`/api/v1/complaints/${complaint.id}/upvote`).set('Cookie', `access_token=${token}`),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const updated = await Complaint.findById(complaint.id);
    expect(updated.upvotes).toHaveLength(0);
    expect(updated.upvoteCount).toBe(0);

    const upvoteResponse = await requestApp
      .post(`/api/v1/complaints/${complaint.id}/upvote`)
      .set('Cookie', `access_token=${token}`);
    expect(upvoteResponse.body.data).toEqual({ upvoted: true, upvoteCount: 1 });
  });

  it('returns filtered, paginated public complaints with the current user upvote state', async () => {
    const upvoted = await Complaint.create({
      user: user.id,
      category: category.id,
      title: 'Roadside pothole',
      description: 'A deep pothole on the road is creating a dangerous hazard for residents.',
      location: 'Main Road',
      status: 'submitted',
      upvotes: [user.id],
      upvoteCount: 1,
    });
    const otherPothole = await Complaint.create({
      user: user.id,
      category: category.id,
      title: 'Another pothole report',
      description: 'Another pothole has appeared near the bus stop and needs attention.',
      location: 'Bus Stop Road',
      status: 'submitted',
    });

    const response = await requestApp
      .get(`/api/v1/complaints/public?category=${category.id}&status=submitted&search=pothole&sort=most_upvoted&page=1&limit=1`)
      .set('Cookie', `access_token=${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.complaints).toHaveLength(1);
    expect(response.body.data.complaints[0]).toMatchObject({
      _id: upvoted.id,
      upvoteCount: 1,
      hasUpvoted: true,
    });
    expect(response.body.data.complaints[0]).not.toHaveProperty('upvotes');
    expect(response.body.data.pagination).toMatchObject({
      page: 1,
      limit: 1,
      total: 2,
      hasNextPage: true,
    });

    const nextPage = await requestApp
      .get(`/api/v1/complaints/public?category=${category.id}&status=submitted&search=pothole&sort=most_upvoted&page=2&limit=1`)
      .set('Cookie', `access_token=${token}`);
    expect(nextPage.status).toBe(200);
    expect(nextPage.body.data.complaints[0]).toMatchObject({
      _id: otherPothole.id,
      upvoteCount: 0,
      hasUpvoted: false,
    });
    expect(nextPage.body.data.pagination.hasNextPage).toBe(false);
  });

  it('rejects invalid public feed filters', async () => {
    const response = await requestApp
      .get('/api/v1/complaints/public?sort=unsupported')
      .set('Cookie', `access_token=${token}`);

    expect(response.status).toBe(422);
  });

  it('notifies the complaint owner once when an upvote milestone is reached', async () => {
    const complaint = await Complaint.create({
      user: user.id,
      category: category.id,
      title: 'Frequent street flooding',
      description: 'Rain water floods this street after every storm and blocks local residents.',
      location: 'River Road',
      upvotes: Array.from({ length: 9 }, () => new mongoose.Types.ObjectId()),
      upvoteCount: 9,
    });

    await requestApp.post(`/api/v1/complaints/${complaint.id}/upvote`).set('Cookie', `access_token=${token}`).expect(200);
    await requestApp.post(`/api/v1/complaints/${complaint.id}/upvote`).set('Cookie', `access_token=${token}`).expect(200);
    await requestApp.post(`/api/v1/complaints/${complaint.id}/upvote`).set('Cookie', `access_token=${token}`).expect(200);

    const milestoneNotifications = await Notification.find({
      user: user.id,
      complaint: complaint.id,
      type: 'complaint_upvote_milestone',
    });
    expect(milestoneNotifications).toHaveLength(1);
    expect(milestoneNotifications[0].message).toContain('received 10 upvotes');
  });

  it('lists and updates a complaint', async () => {
    const complaint = await Complaint.create({
      user: user.id,
      category: category.id,
      title: 'Pothole issue',
      description: 'The pothole near the school entrance is worsening rapidly.',
      location: 'School Road',
      latitude: 28.6139,
      longitude: 77.209,
    });

    const listResponse = await requestApp.get('/api/v1/complaints').set('Authorization', `Bearer ${token}`);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.complaints).toHaveLength(1);

    const mapResponse = await requestApp
      .get('/api/v1/complaints/map')
      .set('Cookie', `access_token=${token}`);
    expect(mapResponse.status).toBe(200);
    expect(mapResponse.body.data.complaints[0]).toMatchObject({
      _id: complaint.id,
      location: { address: 'School Road', coordinates: { lat: 28.6139, lng: 77.209 } },
    });

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
