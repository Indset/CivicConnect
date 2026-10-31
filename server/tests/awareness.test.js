import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "@jest/globals";
import { connectTestDatabase, disconnectTestDatabase } from "./helpers/db.js";
import { requestApp } from "./helpers/testApp.js";
import Drive from "../src/modules/awareness/models/drive.model.js";
import Tip from "../src/modules/awareness/models/tip.model.js";
import User from "../src/modules/auth/models/user.model.js";
import { signAccessToken } from "../src/modules/auth/utils/jwt.js";

const futureDate = (days = 5) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const pastDate = () => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 3);
  return date.toISOString().slice(0, 10);
};

const drivePayload = (overrides = {}) => ({
  title: "Neighbourhood cleanup",
  description:
    "Join neighbours to collect litter and refresh our shared public spaces.",
  location: { address: "Community Park, Sector 12" },
  date: futureDate(),
  startTime: "08:00",
  endTime: "10:00",
  organizer: "Community Group",
  ...overrides,
});

describe("Awareness API", () => {
  let adminToken;
  let citizenToken;
  let secondCitizenToken;

  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Tip.deleteMany({}),
      Drive.deleteMany({}),
    ]);
    const [admin, citizen, secondCitizen] = await User.create([
      {
        fullName: "Admin User",
        email: "awareness-admin@example.com",
        phone: "+919555555555",
        password: "StrongPass123!",
        role: "admin",
      },
      {
        fullName: "Citizen User",
        email: "awareness-citizen@example.com",
        phone: "+919444444444",
        password: "StrongPass123!",
      },
      {
        fullName: "Second Citizen",
        email: "awareness-second@example.com",
        phone: "+919333333333",
        password: "StrongPass123!",
      },
    ]);
    adminToken = signAccessToken(admin.id);
    citizenToken = signAccessToken(citizen.id);
    secondCitizenToken = signAccessToken(secondCitizen.id);
  });

  it("serves public filtered and paginated tips while restricting writes to admins", async () => {
    const created = await requestApp
      .post("/api/v1/awareness/tips")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Keep public spaces clean",
        content:
          "Dispose of waste responsibly and help keep shared places clean.",
        category: "Cleanliness",
      });
    expect(created.status).toBe(201);

    const publicResponse = await requestApp.get(
      "/api/v1/awareness/tips?category=Cleanliness&page=1&limit=1",
    );
    expect(publicResponse.status).toBe(200);
    expect(publicResponse.body.data.tips).toHaveLength(1);
    expect(publicResponse.body.data.pagination).toMatchObject({
      page: 1,
      limit: 1,
      total: 1,
    });
    expect(publicResponse.body.data.tips[0].category).toBe("Cleanliness");

    const forbidden = await requestApp
      .post("/api/v1/awareness/tips")
      .set("Authorization", `Bearer ${citizenToken}`)
      .send({
        title: "Keep public spaces clean",
        content:
          "Dispose of waste responsibly and help keep shared places clean.",
        category: "Cleanliness",
      });
    expect(forbidden.status).toBe(403);
  });

  it("supports public drive details and admin CRUD with validated event times", async () => {
    const unauthorized = await requestApp
      .post("/api/v1/awareness/drives")
      .send(drivePayload());
    expect(unauthorized.status).toBe(401);

    const invalid = await requestApp
      .post("/api/v1/awareness/drives")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(drivePayload({ startTime: "12:00", endTime: "11:00" }));
    expect(invalid.status).toBe(422);

    const created = await requestApp
      .post("/api/v1/awareness/drives")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(drivePayload({ maxParticipants: 3 }));
    expect(created.status).toBe(201);
    const id = created.body.data.drive._id;

    const publicDetails = await requestApp.get(
      `/api/v1/awareness/drives/${id}`,
    );
    expect(publicDetails.status).toBe(200);
    expect(publicDetails.body.data.drive).toMatchObject({
      status: "upcoming",
      participantsCount: 0,
      hasJoined: false,
    });

    const updated = await requestApp
      .put(`/api/v1/awareness/drives/${id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ organizer: "Updated Community Group" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.drive.organizer).toBe("Updated Community Group");

    const incompleteTimeUpdate = await requestApp
      .put(`/api/v1/awareness/drives/${id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ startTime: "09:00" });
    expect(incompleteTimeUpdate.status).toBe(422);

    const deleted = await requestApp
      .delete(`/api/v1/awareness/drives/${id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(deleted.status).toBe(200);
  });

  it("allows an authenticated user to join and leave while enforcing capacity and past dates", async () => {
    const created = await Drive.create({
      ...drivePayload({ maxParticipants: 1 }),
      createdBy: (await User.findOne({ role: "admin" })).id,
    });
    const joined = await requestApp
      .post(`/api/v1/awareness/drives/${created.id}/join`)
      .set("Authorization", `Bearer ${citizenToken}`);
    expect(joined.status).toBe(200);
    expect(joined.body.data.drive).toMatchObject({
      participantsCount: 1,
      hasJoined: true,
    });

    const full = await requestApp
      .post(`/api/v1/awareness/drives/${created.id}/join`)
      .set("Authorization", `Bearer ${secondCitizenToken}`);
    expect(full.status).toBe(409);

    const idempotentJoin = await requestApp
      .post(`/api/v1/awareness/drives/${created.id}/join`)
      .set("Authorization", `Bearer ${citizenToken}`);
    expect(idempotentJoin.status).toBe(200);
    expect(idempotentJoin.body.data.drive.participantsCount).toBe(1);

    const left = await requestApp
      .post(`/api/v1/awareness/drives/${created.id}/leave`)
      .set("Authorization", `Bearer ${citizenToken}`);
    expect(left.status).toBe(200);
    expect(left.body.data.drive).toMatchObject({
      participantsCount: 0,
      hasJoined: false,
    });

    const largerDrive = await Drive.create({
      ...drivePayload({ maxParticipants: 3 }),
      title: "Large neighbourhood cleanup",
      createdBy: (await User.findOne({ role: "admin" })).id,
    });
    for (const token of [citizenToken, secondCitizenToken]) {
      const participation = await requestApp
        .post(`/api/v1/awareness/drives/${largerDrive.id}/join`)
        .set("Authorization", `Bearer ${token}`);
      expect(participation.status).toBe(200);
    }
    const capacityReduction = await requestApp
      .put(`/api/v1/awareness/drives/${largerDrive.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ maxParticipants: 1 });
    expect(capacityReduction.status).toBe(409);

    const past = await Drive.create({
      ...drivePayload({ date: pastDate() }),
      createdBy: (await User.findOne({ role: "admin" })).id,
    });
    const rejected = await requestApp
      .post(`/api/v1/awareness/drives/${past.id}/join`)
      .set("Authorization", `Bearer ${citizenToken}`);
    expect(rejected.status).toBe(409);
  });
});
