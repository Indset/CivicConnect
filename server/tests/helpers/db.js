import fs from 'node:fs/promises';
import path from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer;
const downloadDir = path.join(process.cwd(), '.cache', 'mongodb-binaries');
const mongoVersion = process.env.MONGOMS_VERSION ?? '7.0.5';

const prepareDownloadDir = async () => {
  await fs.mkdir(downloadDir, { recursive: true });
};

const resolveSystemBinary = async () => {
  const candidates = [
    process.env.MONGOMS_SYSTEM_BINARY,
    process.env.MONGOMS_BINARY,
    process.env.MONGOD_BINARY,
    path.join(process.env.ProgramFiles ?? 'C:\\Program Files', 'MongoDB', 'Server', '8.3', 'bin', 'mongod.exe'),
    path.join(process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)', 'MongoDB', 'Server', '8.3', 'bin', 'mongod.exe'),
    'C:\\Program Files\\MongoDB\\Server\\8.3\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\8.3\\bin\\mongod',
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }

  return null;
};

export const connectTestDatabase = async () => {
  if (mongoose.connection.readyState === 1) return;
  if (!mongoServer) {
    const systemBinary = await resolveSystemBinary();
    const createOptions = {
      instance: {
        dbName: 'civicconnect-test',
        storageEngine: 'wiredTiger',
      },
    };

    if (systemBinary) {
      createOptions.binary = { systemBinary };
    } else {
      await prepareDownloadDir();
      createOptions.binary = {
        version: mongoVersion,
        downloadDir,
      };
    }

    mongoServer = await MongoMemoryServer.create(createOptions);
  }
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, { dbName: 'civicconnect-test' });
};

export const disconnectTestDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = undefined;
  }
};
