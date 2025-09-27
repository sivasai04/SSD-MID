const Participant = require("../models/Participant");

// @route   GET /api/users/me
// @desc    Get current user's profile
// @access  Private
exports.getMe = async (req, res) => {
  try {
    // req.user.id is available from the auth middleware
    const user = await Participant.findOne({ id: req.user.id }).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
};