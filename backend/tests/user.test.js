const request = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const app = require("../src/app"); // Adjust path if your app entry point is different
const Participant = require("../src/models/Participant");

let userToken;

beforeAll(async () => {
  // Use a dedicated test database
  await mongoose.connect("mongodb://127.0.0.1:27017/vidyavichar_test_user");
  await Participant.deleteMany({});

  const passwordHash = await bcrypt.hash("password123", 10);

  // Create a sample user for testing
  await Participant.create({
    id: "prof001",
    name: "Professor Test",
    email: "professor@test.com",
    passwordHash,
    role: "instructor",
    courses: [{ courseName: "Advanced Algorithms", enrolled: true, isInstructor: true }]
  });

  // Log in the user to get a token for authenticated requests
  const loginResponse = await request(app)
    .post("/api/auth/login")
    .send({ email: "professor@test.com", password: "password123" });

  userToken = loginResponse.body.token;
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe("User Profile API", () => {
  test("Should fetch the profile of the currently logged-in user", async () => {
    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${userToken}`);

    // --- Assertions ---
    expect(res.status).toBe(200);

    // Check that the response body contains the expected user information
    expect(res.body).toHaveProperty("id", "prof001");
    expect(res.body).toHaveProperty("name", "Professor Test");
    expect(res.body).toHaveProperty("email", "professor@test.com");
    expect(res.body).toHaveProperty("role", "instructor");

    // Check for course details
    expect(res.body.courses).toBeInstanceOf(Array);
    expect(res.body.courses.length).toBe(1);
    expect(res.body.courses[0]).toHaveProperty("courseName", "Advanced Algorithms");
    expect(res.body.courses[0]).toHaveProperty("isInstructor", true);

    // Ensure sensitive information is not sent
    expect(res.body).not.toHaveProperty("passwordHash");
  });

  test("Should return 401 Unauthorized if no token is provided", async () => {
    const res = await request(app).get("/api/users/me");
    expect(res.status).toBe(401);
  });
});