import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { connectTestDatabase, disconnectTestDatabase } from './helpers/db.js';
import mongoose from 'mongoose';

describe('Database setup', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it('connects to the in-memory database', () => {
    expect(mongoose.connection.readyState).toBe(1);
  });
});
