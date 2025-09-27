const request = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const app = require("../src/app");
const Participant = require("../src/models/Participant");

beforeAll(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017/vidyavichar_test_auth");
  await Participant.deleteMany({});

  const passwordHash = await bcrypt.hash("password123", 10);

  await Participant.create({
    id: "inst001",
    name: "Dr. Instructor",
    email: "instructor@test.com",
    passwordHash,
    role: "instructor",
    courses: [{ courseName: "System Design", enrolled: true, isInstructor: true }]
  });
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe("Auth API", () => {
  test("Login succeeds with valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "instructor@test.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  test("Login fails with invalid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "instructor@test.com", password: "wrong" });

    expect(res.status).toBe(401);
  });
});
