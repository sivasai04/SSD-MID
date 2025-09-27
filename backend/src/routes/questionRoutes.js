const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { postQuestion, markAnswered } = require("../controllers/questionController");

router.post("/:sessionId", auth, postQuestion);
router.patch("/:sessionId/:questionId/answered", auth, markAnswered);

module.exports = router;
