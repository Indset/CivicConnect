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
import User from "../src/modules/auth/models/user.model.js";
import Category from "../src/modules/categories/models/category.model.js";
import { signAccessToken } from "../src/modules/auth/utils/jwt.js";
import {
  suggestCategoryWithKeywords,
  validateModelSuggestion,
} from "../src/modules/ai/services/category-suggestion.service.js";

describe("AI category suggestions", () => {
  let token;
  let roads;

  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Category.deleteMany({});
    const user = await User.create({
      fullName: "Suggestion User",
      email: "suggestion@example.com",
      phone: "+919111111111",
      password: "StrongPass123!",
    });
    token = signAccessToken(user.id);
    [roads] = await Category.create([
      {
        name: "Roads",
        description: "Road, street, traffic and pavement issues",
      },
      {
        name: "Water Supply",
        description: "Water pipes, drains, leaks and flooding",
      },
    ]);
  });

  it("uses keyword matching and returns only a database category", async () => {
    const suggestion = suggestCategoryWithKeywords(
      [roads],
      "Large pothole on the road",
      "The road surface is broken near the junction.",
    );

    expect(suggestion).toMatchObject({
      categoryId: roads.id,
      categoryName: "Roads",
      confidence: expect.any(Number),
      reason: expect.stringContaining("road"),
    });
  });

  it("rejects model suggestions that do not exactly match a database category", () => {
    expect(
      validateModelSuggestion(
        {
          categoryId: "507f1f77bcf86cd799439011",
          categoryName: "Invented category",
          confidence: 0.99,
          reason: "Unsupported output",
        },
        [roads],
      ),
    ).toBeNull();
  });

  it("returns a keyword fallback for an authenticated request when running without the AI provider", async () => {
    const response = await requestApp
      .post("/api/v1/ai/suggest-category")
      .set("Cookie", `access_token=${token}`)
      .send({
        title: "Large pothole on the road",
        description: "The road surface is broken near the junction.",
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      categoryId: roads.id,
      categoryName: "Roads",
      confidence: expect.any(Number),
      reason: expect.stringContaining("road"),
    });
  });

  it("requires authentication and validates the input", async () => {
    const unauthorized = await requestApp
      .post("/api/v1/ai/suggest-category")
      .send({
        title: "Pothole on road",
        description: "Road damage reported here.",
      });
    expect(unauthorized.status).toBe(401);

    const invalid = await requestApp
      .post("/api/v1/ai/suggest-category")
      .set("Cookie", `access_token=${token}`)
      .send({ title: "Tiny", description: "Too short" });
    expect(invalid.status).toBe(422);
  });

  it("returns an explicit error when there are no active categories", async () => {
    await Category.deleteMany({});
    const response = await requestApp
      .post("/api/v1/ai/suggest-category")
      .set("Cookie", `access_token=${token}`)
      .send({
        title: "Large pothole on the road",
        description: "The road surface is broken near the junction.",
      });

    expect(response.status).toBe(503);
  });
});
