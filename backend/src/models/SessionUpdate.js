const mongoose = require("mongoose");

const UpdateSchema = new mongoose.Schema(
  {
    questionId: mongoose.Schema.Types.ObjectId,
    updateType: { type: String, enum: ["newQuestion", "statusChange", "newReply"], required: true },
    updatedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const SessionUpdateSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true },
    userId: { type: String, required: true },
    lastSeenAt: { type: Date, default: Date.now },
    updates: { type: [UpdateSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("SessionUpdate", SessionUpdateSchema);
