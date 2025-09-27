const request = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const app = require("../src/app");
const Participant = require("../src/models/Participant");

let studentToken, sessionId;

beforeAll(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017/vidyavichar_test_updates");
  await Participant.deleteMany({});

  const passwordHash = await bcrypt.hash("password123", 10);

  await Participant.create({
    id: "stu001",
    name: "Alice Student",
    email: "student@test.com",
    passwordHash,
    role: "student",
    courses: [{ courseName: "System Design", enrolled: true }]
  });

  studentToken = (await request(app).post("/api/auth/login")
    .send({ email: "student@test.com", password: "password123" })).body.token;

  sessionId = "test_session_1"; // fake session for testing updates
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe("Updates API", () => {
  test("Mark session as seen", async () => {
    const res = await request(app)
      .post(`/api/updates/${sessionId}/seen`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("lastSeenAt");
  });

  test("Get updates (empty)", async () => {
    const res = await request(app)
      .get(`/api/updates/${sessionId}`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.updates).toEqual([]);
  });
});
