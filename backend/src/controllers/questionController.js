const Session = require("../models/Session");
const SessionUpdate = require("../models/SessionUpdate");
const { getIo } = require("../socket");
const Participant = require("../models/Participant");

// Post question (students only during live)
exports.postQuestion = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { text } = req.body;

    // 🚨 Empty question check
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ message: "Empty question" });
    }

    const session = await Session.findOne({ sessionId });
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (session.status !== "live") return res.status(400).json({ message: "Session not live" });

    // Authorization
    const isEnrolled = (req.user.courses || []).some(
    c => c.courseName === session.courseName && c.enrolled
    );
    
    if (!isEnrolled) {
      return res.status(403).json({ message: "Not enrolled in this course" });
    }

    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can post questions" });
    }
    
    // 🚨 Extra check: block TAs
    const isTA = (req.user.courses || []).some(
      c => c.courseName === session.courseName && c.isTA
    );
    
    if (isTA) {
      return res.status(403).json({ message: "TAs cannot post questions" });
    }

    // 🚨 Duplicate question check (case-insensitive, trimmed)
    const duplicate = session.questions.some(
      q => q.text.trim().toLowerCase() === text.trim().toLowerCase()
    );
    if (duplicate) {
      return res.status(400).json({ message: "Duplicate question not allowed" });
    }

    const newQ = {
      text: text.trim(),
      author: { id: req.user.id, name: req.user.name },
      status: "unanswered"
    };

    session.questions.push(newQ);
    await session.save();

    const question = session.questions[session.questions.length - 1];

    // record update for other participants
    const participants = await Participant.find({ "courses.courseName": session.courseName });
    const updates = participants.map(p => ({
      updateOne: {
        filter: { sessionId, userId: p.id },
        update: {
          $setOnInsert: { sessionId, userId: p.id, lastSeenAt: p.id === req.user.id ? new Date() : new Date(0) },
          $push: { updates: { questionId: question._id, updateType: "newQuestion", updatedAt: new Date() } }
        },
        upsert: true
      }
    }));
    if (updates.length) await SessionUpdate.bulkWrite(updates);

    const io = getIo();
    if (io) io.to(sessionId).emit("question:created", question);

    res.json(question);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error posting question", error: err.message });
  }
};

// Mark answered (instructor live; instructor+TA after)
exports.markAnswered = async (req, res) => {
  try {
    const { sessionId, questionId } = req.params;
    const session = await Session.findOne({ sessionId });
    if (!session) return res.status(404).json({ message: "Session not found" });

    const question = session.questions.id(questionId);
    if (!question) return res.status(404).json({ message: "Question not found" });

    if (session.status === "live" && req.user.role !== "instructor") {
      return res.status(403).json({ message: "Only instructor can mark answered during live session" });
    }
    if (session.status === "completed") {
      const isTA = (req.user.courses || []).some(c => c.courseName === session.courseName && c.isTA);
      if (req.user.role !== "instructor" && !isTA) {
        return res.status(403).json({ message: "Only instructor or TA can mark answered after session" });
      }
    }

    if (question.status === "answered") return res.json(question);

    question.status = "answered";
    question.updatedAt = new Date();
    await session.save();

    const participants = await Participant.find({ "courses.courseName": session.courseName });
    const updates = participants.map(p => ({
      updateOne: {
        filter: { sessionId, userId: p.id },
        update: {
          $push: { updates: { questionId: question._id, updateType: "statusChange", updatedAt: new Date() } }
        },
        upsert: true
      }
    }));
    if (updates.length) await SessionUpdate.bulkWrite(updates);

    const io = getIo();
    if (io) io.to(sessionId).emit("question:answered", { questionId: question._id, status: "answered" });

    res.json(question);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error marking answered", error: err.message });
  }
};
