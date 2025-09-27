const mongoose = require("mongoose");

const CourseSubSchema = new mongoose.Schema({
  courseName: { type: String, required: true },
  enrolled: { type: Boolean, default: false },
  isTA: { type: Boolean, default: false },
  isInstructor: { type: Boolean, default: false }
});

const ParticipantSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["instructor", "student"], required: true },
    courses: { type: [CourseSubSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Participant", ParticipantSchema);
