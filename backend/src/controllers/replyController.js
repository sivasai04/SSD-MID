const Session = require("../models/Session");
const SessionUpdate = require("../models/SessionUpdate");
const Participant = require("../models/Participant");
const { getIo } = require("../socket");

exports.postReply = async (req, res) => {
  try {
    const { sessionId, questionId } = req.params;
    const { text, parentReplyId } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) return res.status(400).json({ message: "Empty reply" });

    const session = await Session.findOne({ sessionId });
    if (!session) return res.status(404).json({ message: "Session not found" });

    const question = session.questions.id(questionId);
    if (!question) return res.status(404).json({ message: "Question not found" });

    if (session.status === "live" && req.user.role !== "instructor") {
      return res.status(403).json({ message: "Only instructor can reply during live session" });
    }
    if (session.status === "completed") {
      const isTA = (req.user.courses || []).some(c => c.courseName === session.courseName && c.isTA);
      if (req.user.role !== "instructor" && !isTA) {
        return res.status(403).json({ message: "Only instructor or TA can reply after session" });
      }
    }

    const newReply = {
      parentReplyId: parentReplyId || null,
      author: { id: req.user.id, name: req.user.name },
      text: text.trim()
    };

    question.replies.push(newReply);
    question.updatedAt = new Date();
    await session.save();

    const reply = question.replies[question.replies.length - 1];

    const participants = await Participant.find({ "courses.courseName": session.courseName });
    const updates = participants.map(p => ({
      updateOne: {
        filter: { sessionId, userId: p.id },
        update: {
          $push: { updates: { questionId: question._id, updateType: "newReply", updatedAt: new Date() } }
        },
        upsert: true
      }
    }));
    if (updates.length) await SessionUpdate.bulkWrite(updates);

    const io = getIo();
    if (io) io.to(sessionId).emit("reply:created", { questionId: question._id, reply });

    res.json(reply);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error posting reply", error: err.message });
  }
};
