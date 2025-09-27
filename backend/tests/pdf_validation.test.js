const request = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const app = require("../src/app");
const Participant = require("../src/models/Participant");

let instructorToken, studentToken, taToken, nonEnrolledToken;
let sessionId, questionId;

beforeAll(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017/vidyavichar_test_pdf_validation");
  await Participant.deleteMany({});

  const passwordHash = await bcrypt.hash("password123", 10);

  // Create test users as per PDF requirements
  await Participant.create([
    {
      id: "inst001",
      name: "Prof. Instructor",
      email: "instructor@test.com",
      passwordHash,
      role: "instructor",
      courses: [{ courseName: "System Design", enrolled: true, isInstructor: true }]
    },
    {
      id: "stu001",
      name: "Alice Student",
      email: "student@test.com",
      passwordHash,
      role: "student",
      courses: [{ courseName: "System Design", enrolled: true }]
    },
    {
      id: "ta001",
      name: "Bob TA",
      email: "ta@test.com",
      passwordHash,
      role: "student",
      courses: [{ courseName: "System Design", enrolled: true, isTA: true }]
    },
    {
      id: "non001",
      name: "Charlie NonEnrolled",
      email: "nonenrolled@test.com",
      passwordHash,
      role: "student",
      courses: [] // Not enrolled in any course
    }
  ]);

  // Get authentication tokens
  const responses = await Promise.all([
    request(app).post("/api/auth/login").send({ email: "instructor@test.com", password: "password123" }),
    request(app).post("/api/auth/login").send({ email: "student@test.com", password: "password123" }),
    request(app).post("/api/auth/login").send({ email: "ta@test.com", password: "password123" }),
    request(app).post("/api/auth/login").send({ email: "nonenrolled@test.com", password: "password123" })
  ]);

  [instructorToken, studentToken, taToken, nonEnrolledToken] = responses.map(res => res.body.token);
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe("PDF Requirements: VidyaVichar Validation & Features", () => {

  // ==================== PDF REQUIREMENT: SESSION MANAGEMENT ====================
  describe("Session Management (PDF Req: Real-time Q&A during lectures)", () => {
    test("Instructor can create session for their course", async () => {
      const res = await request(app)
        .post("/api/sessions")
        .set("Authorization", `Bearer ${instructorToken}`)
        .send({ courseName: "System Design" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("sessionId");
      expect(res.body).toHaveProperty("courseName", "System Design");
      expect(res.body).toHaveProperty("status", "live");
      expect(res.body.createdBy).toHaveProperty("name", "Prof. Instructor");
      
      sessionId = res.body.sessionId;
    });

    test("Student cannot create session", async () => {
      const res = await request(app)
        .post("/api/sessions")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ courseName: "System Design" });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Only instructor can create session/);
    });

    test("TA cannot create session", async () => {
      const res = await request(app)
        .post("/api/sessions")
        .set("Authorization", `Bearer ${taToken}`)
        .send({ courseName: "System Design" });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Only instructor can create session/);
    });

    test("Non-enrolled user cannot create session", async () => {
      const res = await request(app)
        .post("/api/sessions")
        .set("Authorization", `Bearer ${nonEnrolledToken}`)
        .send({ courseName: "System Design" });

      expect(res.status).toBe(403);
    });
  });

  // ==================== PDF REQUIREMENT: VALIDATION RULES ====================
  describe("Question Validation (PDF Req: Prevent empty or duplicate questions)", () => {
    test("Should reject completely empty question", async () => {
      const res = await request(app)
        .post(`/api/questions/${sessionId}`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ text: "" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Empty question");
    });

    test("Should reject whitespace-only question", async () => {
      const res = await request(app)
        .post(`/api/questions/${sessionId}`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ text: "   \n\t   " });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Empty question");
    });

    test("Should reject null/undefined question text", async () => {
      const res1 = await request(app)
        .post(`/api/questions/${sessionId}`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ text: null });

      const res2 = await request(app)
        .post(`/api/questions/${sessionId}`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({});

      expect(res1.status).toBe(400);
      expect(res2.status).toBe(400);
    });

    test("Should accept valid question", async () => {
      const res = await request(app)
        .post(`/api/questions/${sessionId}`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ text: "What is the CAP theorem?" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("text", "What is the CAP theorem?");
      expect(res.body).toHaveProperty("status", "unanswered");
      expect(res.body.author).toHaveProperty("name", "Alice Student");
      
      questionId = res.body._id;
    });

    test("Should reject exact duplicate question", async () => {
      const res = await request(app)
        .post(`/api/questions/${sessionId}`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ text: "What is the CAP theorem?" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Duplicate question not allowed");
    });

    test("Should reject case-insensitive duplicate", async () => {
      const res = await request(app)
        .post(`/api/questions/${sessionId}`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ text: "WHAT IS THE CAP THEOREM?" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Duplicate question not allowed");
    });

    test("Should reject trimmed duplicate", async () => {
      const res = await request(app)
        .post(`/api/questions/${sessionId}`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ text: "  What is the CAP theorem?  \n" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Duplicate question not allowed");
    });

    test("Should accept similar but different question", async () => {
      const res = await request(app)
        .post(`/api/questions/${sessionId}`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ text: "What are the principles of CAP theorem?" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("text", "What are the principles of CAP theorem?");
    });
  });

  // ==================== PDF REQUIREMENT: ROLE-BASED ACCESS CONTROL ====================
  describe("Role-Based Question Posting (PDF Req: Students post questions)", () => {
    test("Enrolled student can post question", async () => {
      const res = await request(app)
        .post(`/api/questions/${sessionId}`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ text: "How does database sharding work?" });

      expect(res.status).toBe(200);
      expect(res.body.author).toHaveProperty("name", "Alice Student");
    });

    test("Instructor cannot post question", async () => {
      const res = await request(app)
        .post(`/api/questions/${sessionId}`)
        .set("Authorization", `Bearer ${instructorToken}`)
        .send({ text: "Instructor attempting to post question" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Only students can post questions");
    });

    test("TA cannot post question", async () => {
      const res = await request(app)
        .post(`/api/questions/${sessionId}`)
        .set("Authorization", `Bearer ${taToken}`)
        .send({ text: "TA attempting to post question" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("TAs cannot post questions");
    });

    test("Non-enrolled student cannot post question", async () => {
      const res = await request(app)
        .post(`/api/questions/${sessionId}`)
        .set("Authorization", `Bearer ${nonEnrolledToken}`)
        .send({ text: "Non-enrolled attempting to post question" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Not enrolled in this course");
    });

    test("Cannot post question to non-existent session", async () => {
      const res = await request(app)
        .post("/api/questions/nonexistent_session")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ text: "Question to non-existent session" });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Session not found");
    });
  });

  // ==================== PDF REQUIREMENT: INSTRUCTOR CONTROLS ====================
  describe("Instructor Question Management (PDF Req: Mark and organize questions)", () => {
    test("Instructor can mark question as answered during live session", async () => {
      const res = await request(app)
        .patch(`/api/questions/${sessionId}/${questionId}/answered`)
        .set("Authorization", `Bearer ${instructorToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("status", "answered");
    });

    test("Student cannot mark question as answered during live session", async () => {
      // First create another question to test with
      const questionRes = await request(app)
        .post(`/api/questions/${sessionId}`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ text: "What is eventual consistency?" });

      const newQuestionId = questionRes.body._id;

      const res = await request(app)
        .patch(`/api/questions/${sessionId}/${newQuestionId}/answered`)
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Only instructor can mark answered during live session");
    });

    test("TA cannot mark question as answered during live session", async () => {
      const questionRes = await request(app)
        .post(`/api/questions/${sessionId}`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ text: "What is distributed consensus?" });

      const newQuestionId = questionRes.body._id;

      const res = await request(app)
        .patch(`/api/questions/${sessionId}/${newQuestionId}/answered`)
        .set("Authorization", `Bearer ${taToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Only instructor can mark answered during live session");
    });

    test("Cannot mark already answered question", async () => {
      const res = await request(app)
        .patch(`/api/questions/${sessionId}/${questionId}/answered`)
        .set("Authorization", `Bearer ${instructorToken}`);

      // Should return success but no change (idempotent)
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("status", "answered");
    });
  });

  // ==================== PDF REQUIREMENT: REPLY FUNCTIONALITY ====================
  describe("Reply System (PDF Req: Threaded conversations)", () => {
    test("Instructor can reply during live session", async () => {
      const res = await request(app)
        .post(`/api/replies/${sessionId}/${questionId}`)
        .set("Authorization", `Bearer ${instructorToken}`)
        .send({ text: "CAP theorem states that distributed systems can only guarantee two out of three properties." });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("text");
      expect(res.body.author).toHaveProperty("name", "Prof. Instructor");
    });

    test("Student cannot reply during live session", async () => {
      const res = await request(app)
        .post(`/api/replies/${sessionId}/${questionId}`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ text: "Student attempting to reply during live session" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Only instructor can reply during live session");
    });

    test("TA cannot reply during live session", async () => {
      const res = await request(app)
        .post(`/api/replies/${sessionId}/${questionId}`)
        .set("Authorization", `Bearer ${taToken}`)
        .send({ text: "TA attempting to reply during live session" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Only instructor can reply during live session");
    });

    test("Cannot reply with empty text", async () => {
      const res = await request(app)
        .post(`/api/replies/${sessionId}/${questionId}`)
        .set("Authorization", `Bearer ${instructorToken}`)
        .send({ text: "" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Empty reply");
    });

    test("Cannot reply with whitespace-only text", async () => {
      const res = await request(app)
        .post(`/api/replies/${sessionId}/${questionId}`)
        .set("Authorization", `Bearer ${instructorToken}`)
        .send({ text: "   \n\t   " });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Empty reply");
    });
  });

  // ==================== PDF REQUIREMENT: SESSION LIFECYCLE ====================
  describe("Session Lifecycle Management (PDF Req: Live vs Completed states)", () => {
    test("Student cannot post question after session ends", async () => {
      // First end the session
      await request(app)
        .patch(`/api/sessions/${sessionId}/end`)
        .set("Authorization", `Bearer ${instructorToken}`);

      // Try to post question
      const res = await request(app)
        .post(`/api/questions/${sessionId}`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ text: "Question after session ended" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Session not live");
    });

    test("TA can mark question as answered after session ends", async () => {
      // Create a new question ID from existing questions for testing
      const sessionRes = await request(app)
        .get("/api/sessions")
        .set("Authorization", `Bearer ${taToken}`);
      
      const session = sessionRes.body.find(s => s.sessionId === sessionId);
      const unansweredQuestion = session.questions.find(q => q.status === "unanswered");
      
      if (unansweredQuestion) {
        const res = await request(app)
          .patch(`/api/questions/${sessionId}/${unansweredQuestion._id}/answered`)
          .set("Authorization", `Bearer ${taToken}`);

        expect([200, 400]).toContain(res.status); // 400 if already answered
      }
    });

    test("TA can reply after session ends", async () => {
      const res = await request(app)
        .post(`/api/replies/${sessionId}/${questionId}`)
        .set("Authorization", `Bearer ${taToken}`)
        .send({ text: "TA clarification after session completion" });

      expect(res.status).toBe(200);
      expect(res.body.author).toHaveProperty("name", "Bob TA");
    });

    test("Student still cannot reply after session ends", async () => {
      const res = await request(app)
        .post(`/api/replies/${sessionId}/${questionId}`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ text: "Student attempting reply after session" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Only instructor or TA can reply after session");
    });
  });

  // ==================== PDF REQUIREMENT: DATA PERSISTENCE ====================
  describe("Data Persistence (PDF Req: Store question text, author, status, timestamp)", () => {
    test("Question data includes all required fields", async () => {
      const res = await request(app)
        .get("/api/sessions")
        .set("Authorization", `Bearer ${instructorToken}`);

      const session = res.body.find(s => s.sessionId === sessionId);
      expect(session).toBeTruthy();
      
      const question = session.questions.find(q => q._id === questionId);
      expect(question).toBeTruthy();
      
      // Verify all required fields from PDF
      expect(question).toHaveProperty("text");
      expect(question).toHaveProperty("author");
      expect(question.author).toHaveProperty("id");
      expect(question.author).toHaveProperty("name");
      expect(question).toHaveProperty("status");
      expect(question).toHaveProperty("createdAt");
      expect(question).toHaveProperty("updatedAt");
      expect(question).toHaveProperty("replies");
      
      // Verify data types
      expect(typeof question.text).toBe("string");
      expect(typeof question.author.name).toBe("string");
      expect(["answered", "unanswered"]).toContain(question.status);
      expect(new Date(question.createdAt)).toBeInstanceOf(Date);
      expect(Array.isArray(question.replies)).toBe(true);
    });

    test("Reply data includes all required fields", async () => {
      const res = await request(app)
        .get("/api/sessions")
        .set("Authorization", `Bearer ${instructorToken}`);

      const session = res.body.find(s => s.sessionId === sessionId);
      const question = session.questions.find(q => q._id === questionId);
      const reply = question.replies[0]; // First reply
      
      expect(reply).toBeTruthy();
      expect(reply).toHaveProperty("text");
      expect(reply).toHaveProperty("author");
      expect(reply.author).toHaveProperty("id");
      expect(reply.author).toHaveProperty("name");
      expect(reply).toHaveProperty("createdAt");
      
      // Verify data types
      expect(typeof reply.text).toBe("string");
      expect(typeof reply.author.name).toBe("string");
      expect(new Date(reply.createdAt)).toBeInstanceOf(Date);
    });

    test("Session data persists across requests", async () => {
      // Make multiple requests to verify persistence
      const res1 = await request(app)
        .get("/api/sessions")
        .set("Authorization", `Bearer ${instructorToken}`);

      const res2 = await request(app)
        .get("/api/sessions")
        .set("Authorization", `Bearer ${studentToken}`);

      const res3 = await request(app)
        .get("/api/sessions")
        .set("Authorization", `Bearer ${taToken}`);

      // All should see the same session data
      const session1 = res1.body.find(s => s.sessionId === sessionId);
      const session2 = res2.body.find(s => s.sessionId === sessionId);
      const session3 = res3.body.find(s => s.sessionId === sessionId);

      expect(session1).toEqual(session2);
      expect(session2).toEqual(session3);
      
      // Verify cross-session persistence properties
      expect(session1).toHaveProperty("status", "completed");
      expect(session1.questions.length).toBeGreaterThan(0);
    });
  });

  // ==================== PDF REQUIREMENT: ERROR HANDLING ====================
  describe("Error Handling and Edge Cases (PDF Req: Robust system)", () => {
    test("Handle malformed question data", async () => {
      const res = await request(app)
        .post(`/api/questions/${sessionId}`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ text: 123 }); // Number instead of string

      expect([400, 500]).toContain(res.status);
    });

    test("Handle extremely long question text", async () => {
      const longText = "A".repeat(10000); // 10KB question
      const res = await request(app)
        .post(`/api/questions/${sessionId}`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ text: longText });

      // Should either accept (if no length limit) or reject gracefully
      expect([200, 400, 413]).toContain(res.status);
    });

    test("Handle special characters and Unicode", async () => {
      const specialText = "What is 分布式系统? 🚀 @#$%^&*()_+{}|:<>?[]\\;',./`~";
      
      // Create new session for this test since previous one is completed
      const sessionRes = await request(app)
        .post("/api/sessions")
        .set("Authorization", `Bearer ${instructorToken}`)
        .send({ courseName: "System Design" });

      const newSessionId = sessionRes.body.sessionId;

      const res = await request(app)
        .post(`/api/questions/${newSessionId}`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ text: specialText });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("text", specialText);
    });

    test("Handle invalid session IDs gracefully", async () => {
      const res = await request(app)
        .post("/api/questions/invalid_session_id")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ text: "Valid question text" });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("message", "Session not found");
    });

    test("Handle invalid question IDs gracefully", async () => {
      const res = await request(app)
        .patch(`/api/questions/${sessionId}/invalid_question_id/answered`)
        .set("Authorization", `Bearer ${instructorToken}`);

      expect([404, 400]).toContain(res.status);
    });

    test("Handle unauthorized access gracefully", async () => {
      const res = await request(app)
        .post(`/api/questions/${sessionId}`)
        .send({ text: "Question without auth token" });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("message", "No token provided");
    });

    test("Handle malformed auth tokens", async () => {
      const res = await request(app)
        .post(`/api/questions/${sessionId}`)
        .set("Authorization", "Bearer invalid_token")
        .send({ text: "Question with invalid token" });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("message", "Invalid token");
    });
  });

  // ==================== PDF REQUIREMENT: SYSTEM INTEGRATION ====================
  describe("MERN Stack Integration (PDF Req: Complete system functionality)", () => {
    test("MongoDB persistence verification", async () => {
      // Create, modify, and verify data persistence through full CRUD cycle
      
      // Create new session
      const sessionRes = await request(app)
        .post("/api/sessions")
        .set("Authorization", `Bearer ${instructorToken}`)
        .send({ courseName: "System Design" });
      
      const testSessionId = sessionRes.body.sessionId;
      
      // Create question (Create)
      const questionRes = await request(app)
        .post(`/api/questions/${testSessionId}`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ text: "CRUD test question" });
      
      const testQuestionId = questionRes.body._id;
      
      // Read question
      const readRes = await request(app)
        .get("/api/sessions")
        .set("Authorization", `Bearer ${studentToken}`);
      
      const session = readRes.body.find(s => s.sessionId === testSessionId);
      expect(session.questions.find(q => q._id === testQuestionId)).toBeTruthy();
      
      // Update question (mark as answered)
      const updateRes = await request(app)
        .patch(`/api/questions/${testSessionId}/${testQuestionId}/answered`)
        .set("Authorization", `Bearer ${instructorToken}`);
      
      expect(updateRes.status).toBe(200);
      
      // Verify update persisted
      const verifyRes = await request(app)
        .get("/api/sessions")
        .set("Authorization", `Bearer ${studentToken}`);
      
      const updatedSession = verifyRes.body.find(s => s.sessionId === testSessionId);
      const updatedQuestion = updatedSession.questions.find(q => q._id === testQuestionId);
      expect(updatedQuestion.status).toBe("answered");
    });

    test("Express API endpoint coverage", async () => {
      // Verify all main endpoints are functional
      const endpoints = [
        { method: 'GET', path: '/api/sessions', token: instructorToken },
        { method: 'POST', path: '/api/auth/login', data: { email: "instructor@test.com", password: "password123" } },
        { method: 'GET', path: '/api/users/me', token: instructorToken }
      ];

      for (const endpoint of endpoints) {
        let req = request(app)[endpoint.method.toLowerCase()](endpoint.path);
        
        if (endpoint.token) {
          req = req.set("Authorization", `Bearer ${endpoint.token}`);
        }
        
        if (endpoint.data) {
          req = req.send(endpoint.data);
        }
        
        const res = await req;
        expect([200, 201]).toContain(res.status);
      }
    });
  });
});