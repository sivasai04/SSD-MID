const request = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const app = require("../src/app");
const Participant = require("../src/models/Participant");

let instructorToken, studentToken, taToken, outsiderToken;
let sessionId, questionId;

beforeAll(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017/vidyavichar_test_integration");
  await Participant.deleteMany({});

  const passwordHash = await bcrypt.hash("password123", 10);

  // Instructor
  await Participant.create({
    id: "inst001",
    name: "Dr. Instructor",
    email: "instructor@test.com",
    passwordHash,
    role: "instructor",
    courses: [{ courseName: "System Design", enrolled: true, isInstructor: true }]
  });

  // Student (enrolled)
  await Participant.create({
    id: "stu001",
    name: "Alice Student",
    email: "student@test.com",
    passwordHash,
    role: "student",
    courses: [{ courseName: "System Design", enrolled: true }]
  });

  // TA
  await Participant.create({
    id: "ta001",
    name: "Ritika Sharma",
    email: "ta@test.com",
    passwordHash,
    role: "student",
    courses: [{ courseName: "System Design", enrolled: true, isTA: true }]
  });

  // Outsider
  await Participant.create({
    id: "outs001",
    name: "Outsider",
    email: "outsider@test.com",
    passwordHash,
    role: "student",
    courses: []
  });

  // Logins
  instructorToken = (await request(app)
    .post("/api/auth/login")
    .send({ email: "instructor@test.com", password: "password123" })).body.token;

  studentToken = (await request(app)
    .post("/api/auth/login")
    .send({ email: "student@test.com", password: "password123" })).body.token;

  taToken = (await request(app)
    .post("/api/auth/login")
    .send({ email: "ta@test.com", password: "password123" })).body.token;

  outsiderToken = (await request(app)
    .post("/api/auth/login")
    .send({ email: "outsider@test.com", password: "password123" })).body.token;
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe("Full Integration Flow", () => {
  // --------------------
  // SESSION CREATION
  // --------------------
  test("Instructor can create a session", async () => {
    const res = await request(app)
      .post("/api/sessions")
      .set("Authorization", `Bearer ${instructorToken}`)
      .send({ courseName: "System Design" });

    expect(res.status).toBe(200);
    sessionId = res.body.sessionId;
  });

  // --------------------
  // QUESTION POSTING RULES
  // --------------------
  test("Student cannot post empty question", async () => {
    const res = await request(app)
      .post(`/api/questions/${sessionId}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ text: "   " });
    expect(res.status).toBe(400);
  });

  test("Enrolled student can post a question", async () => {
    const res = await request(app)
      .post(`/api/questions/${sessionId}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ text: "What is horizontal scaling?" });
    expect(res.status).toBe(200);
    questionId = res.body._id;
  });

  test("Student cannot post duplicate question", async () => {
    const res = await request(app)
      .post(`/api/questions/${sessionId}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ text: "What is horizontal scaling?" });
    expect(res.status).toBe(400);
  });

  test("Instructor cannot post a question", async () => {
    const res = await request(app)
      .post(`/api/questions/${sessionId}`)
      .set("Authorization", `Bearer ${instructorToken}`)
      .send({ text: "Instructor posting" });
    expect(res.status).toBe(403);
  });

  test("TA cannot post a question", async () => {
    const res = await request(app)
      .post(`/api/questions/${sessionId}`)
      .set("Authorization", `Bearer ${taToken}`)
      .send({ text: "TA posting" });
    expect(res.status).toBe(403);
  });

  test("Outsider cannot post a question", async () => {
    const res = await request(app)
      .post(`/api/questions/${sessionId}`)
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ text: "Outsider posting" });
    expect(res.status).toBe(403);
  });

  // --------------------
  // REPLIES DURING LIVE
  // --------------------
  test("Instructor can reply during live session", async () => {
    const res = await request(app)
      .post(`/api/replies/${sessionId}/${questionId}`)
      .set("Authorization", `Bearer ${instructorToken}`)
      .send({ text: "Horizontal scaling = adding servers." });
    expect(res.status).toBe(200);
  });

  test("TA cannot reply during live session", async () => {
    const res = await request(app)
      .post(`/api/replies/${sessionId}/${questionId}`)
      .set("Authorization", `Bearer ${taToken}`)
      .send({ text: "TA reply attempt" });
    expect(res.status).toBe(403);
  });

  test("Student cannot reply during live session", async () => {
    const res = await request(app)
      .post(`/api/replies/${sessionId}/${questionId}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ text: "Student reply attempt" });
    expect(res.status).toBe(403);
  });

  test("Outsider cannot reply during live session", async () => {
    const res = await request(app)
      .post(`/api/replies/${sessionId}/${questionId}`)
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ text: "Outsider reply attempt" });
    expect(res.status).toBe(403);
  });

  // --------------------
  // MARK ANSWERED (LIVE)
  // --------------------
  test("TA cannot mark answered during live", async () => {
    const res = await request(app)
      .patch(`/api/questions/${sessionId}/${questionId}/answered`)
      .set("Authorization", `Bearer ${taToken}`);
    expect(res.status).toBe(403);
  });

  test("Instructor can mark answered during live", async () => {
    const res = await request(app)
      .patch(`/api/questions/${sessionId}/${questionId}/answered`)
      .set("Authorization", `Bearer ${instructorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("answered");
  });

  // --------------------
  // UPDATES DURING LIVE
  // --------------------
  test("Student can mark updates as seen", async () => {
    const res = await request(app)
      .post(`/api/updates/${sessionId}/seen`)
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
  });

  test("Student can fetch unseen updates (empty after mark seen)", async () => {
    const res = await request(app)
      .get(`/api/updates/${sessionId}`)
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.updates).toEqual([]);
  });

  // --------------------
  // END SESSION
  // --------------------
  test("Instructor ends the session", async () => {
    const res = await request(app)
      .patch(`/api/sessions/${sessionId}/end`)
      .set("Authorization", `Bearer ${instructorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("completed");
  });

  // --------------------
  // REPLIES AFTER SESSION
  // --------------------
  test("Instructor can reply after session ends", async () => {
    const res = await request(app)
      .post(`/api/replies/${sessionId}/${questionId}`)
      .set("Authorization", `Bearer ${instructorToken}`)
      .send({ text: "Instructor clarification after session." });
    expect(res.status).toBe(200);
  });

  test("TA can reply after session ends", async () => {
    const res = await request(app)
      .post(`/api/replies/${sessionId}/${questionId}`)
      .set("Authorization", `Bearer ${taToken}`)
      .send({ text: "TA clarification after session." });
    expect(res.status).toBe(200);
  });

  test("Student cannot reply after session ends", async () => {
    const res = await request(app)
      .post(`/api/replies/${sessionId}/${questionId}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ text: "Student reply after session" });
    expect(res.status).toBe(403);
  });

  test("Outsider cannot reply after session ends", async () => {
    const res = await request(app)
      .post(`/api/replies/${sessionId}/${questionId}`)
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ text: "Outsider reply after session" });
    expect(res.status).toBe(403);
  });

  // --------------------
  // MARK ANSWERED AFTER SESSION
  // --------------------
  test("TA can mark answered after session ends", async () => {
    const res = await request(app)
      .patch(`/api/questions/${sessionId}/${questionId}/answered`)
      .set("Authorization", `Bearer ${taToken}`);
    expect([200, 400]).toContain(res.status); // if already answered, 400
  });

  test("Student cannot post question after session ends", async () => {
    const res = await request(app)
      .post(`/api/questions/${sessionId}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ text: "New question after session" });
    expect(res.status).toBe(400);
  });
});
