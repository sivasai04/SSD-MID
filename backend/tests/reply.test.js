const request = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const app = require("../src/app");
const Participant = require("../src/models/Participant");

let instructorToken, taToken, studentToken;
let sessionId, questionId;

beforeAll(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017/vidyavichar_test_reply");
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

  await Participant.create({
    id: "ta001",
    name: "Teaching Assistant",
    email: "ta@test.com",
    passwordHash,
    role: "student",
    courses: [{ courseName: "System Design", enrolled: true, isTA: true }]
  });

  await Participant.create({
    id: "stu001",
    name: "Alice Student",
    email: "student@test.com",
    passwordHash,
    role: "student",
    courses: [{ courseName: "System Design", enrolled: true }]
  });

  instructorToken = (await request(app).post("/api/auth/login")
    .send({ email: "instructor@test.com", password: "password123" })).body.token;

  taToken = (await request(app).post("/api/auth/login")
    .send({ email: "ta@test.com", password: "password123" })).body.token;

  studentToken = (await request(app).post("/api/auth/login")
    .send({ email: "student@test.com", password: "password123" })).body.token;

  sessionId = (await request(app).post("/api/sessions")
    .set("Authorization", `Bearer ${instructorToken}`)
    .send({ courseName: "System Design" })).body.sessionId;

  questionId = (await request(app).post(`/api/questions/${sessionId}`)
    .set("Authorization", `Bearer ${studentToken}`)
    .send({ text: "Explain vertical scaling" })).body._id;
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe("Replies", () => {
  test("Instructor can reply during live session", async () => {
    const res = await request(app)
      .post(`/api/replies/${sessionId}/${questionId}`)
      .set("Authorization", `Bearer ${instructorToken}`)
      .send({ text: "Vertical scaling means upgrading existing servers." });

    expect(res.status).toBe(200);
    expect(res.body.text).toMatch(/Vertical scaling/);
  });

  test("TA cannot reply during live session", async () => {
    const res = await request(app)
      .post(`/api/replies/${sessionId}/${questionId}`)
      .set("Authorization", `Bearer ${taToken}`)
      .send({ text: "TA trying to reply" });

    expect(res.status).toBe(403);
  });

  test("Instructor ends session", async () => {
    await request(app)
      .patch(`/api/sessions/${sessionId}/end`)
      .set("Authorization", `Bearer ${instructorToken}`);
  });

  test("TA can reply after session ends", async () => {
    const res = await request(app)
      .post(`/api/replies/${sessionId}/${questionId}`)
      .set("Authorization", `Bearer ${taToken}`)
      .send({ text: "TA reply after session" });

    expect(res.status).toBe(200);
    expect(res.body.text).toMatch(/TA reply/);
  });
});
