const Session = require("../models/Session");
const Participant = require("../models/Participant");
const { getIo } = require("../socket"); // socket singleton

// Create session (instructor only for that course)
exports.createSession = async (req, res) => {
  try {
    const { courseName } = req.body;
    // check user is instructor for that course
    const isInstructor = (req.user.courses || []).some(c => c.courseName === courseName && c.isInstructor);
    if (!isInstructor) return res.status(403).json({ message: "Only instructor can create session for this course" });

    const session = new Session({
      sessionId: `${courseName.replace(/\s+/g, "_")}_${Date.now()}`,
      courseName,
      createdBy: { id: req.user.id, name: req.user.name }
    });

    await session.save();

    // Emit to course room if you implement course-level rooms (optional)
    const io = getIo();
    if (io) io.to(courseName).emit("session:created", session);

    res.json(session);
  } catch (err) {
    res.status(500).json({ message: "Error creating session", error: err.message });
  }
};

exports.endSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findOne({ sessionId });
    if (!session) return res.status(404).json({ message: "Session not found" });

    // only instructor for that course can end
    const isInstructor = (req.user.courses || []).some(c => c.courseName === session.courseName && c.isInstructor);
    if (!isInstructor) return res.status(403).json({ message: "Only instructor can end this session" });

    session.status = "completed";
    session.endAt = new Date();
    await session.save();

    const io = getIo();
    if (io) io.to(sessionId).emit("session:ended", session);

    res.json(session);
  } catch (err) {
    res.status(500).json({ message: "Error ending session", error: err.message });
  }
};

// Get sessions visible to this user (courseName in their courses)
exports.getMySessions = async (req, res) => {
  try {
    const courseNames = (req.user.courses || []).map(c => c.courseName);
    const sessions = await Session.find({ courseName: { $in: courseNames } }).sort({ createdAt: -1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: "Error fetching sessions", error: err.message });
  }
};
