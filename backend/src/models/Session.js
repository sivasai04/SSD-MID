const mongoose = require("mongoose");

// Reply schema (immutable, nested via parentReplyId)
const ReplySchema = new mongoose.Schema(
  {
    parentReplyId: { type: mongoose.Schema.Types.ObjectId, default: null },
    author: {
      id: String,
      name: String
    },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  {
    timestamps: false,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.id;
      }
    }
  }
);

ReplySchema.virtual("replyId").get(function () {
  return this._id.toHexString();
});

// Question schema (immutable, only status toggles + replies appended)
const QuestionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    author: {
      id: String,
      name: String
    },
    status: { type: String, enum: ["unanswered", "answered"], default: "unanswered" },
    replies: { type: [ReplySchema], default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { 
    timestamps: false,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.id;
      }
    }
  }
);

QuestionSchema.virtual("questionId").get(function () {
  return this._id.toHexString();
});

const SessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    courseName: { type: String, required: true },
    createdBy: {
      id: String,
      name: String
    },
    startAt: { type: Date, default: Date.now },
    endAt: { type: Date, default: null },
    status: { type: String, enum: ["live", "completed"], default: "live" },
    questions: { type: [QuestionSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Session", SessionSchema);
