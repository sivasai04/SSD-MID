const SessionUpdate = require("../models/SessionUpdate");

exports.markSeen = async (req, res) => {
  try {
    const { sessionId } = req.params;
    let rec = await SessionUpdate.findOne({ sessionId, userId: req.user.id });
    if (!rec) {
      rec = new SessionUpdate({ sessionId, userId: req.user.id, lastSeenAt: new Date(), updates: [] });
    } else {
      rec.lastSeenAt = new Date();
    }
    await rec.save();
    res.json({ message: "Marked seen", lastSeenAt: rec.lastSeenAt });
  } catch (err) {
    res.status(500).json({ message: "Error marking seen", error: err.message });
  }
};

exports.getUpdates = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const rec = await SessionUpdate.findOne({ sessionId, userId: req.user.id });
    if (!rec) return res.json({ updates: [] });

    const updates = rec.updates.filter(u => u.updatedAt > rec.lastSeenAt);
    res.json({ updates });
  } catch (err) {
    res.status(500).json({ message: "Error fetching updates", error: err.message });
  }
};
