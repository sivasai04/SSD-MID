const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { postReply } = require("../controllers/replyController");

router.post("/:sessionId/:questionId", auth, postReply);

module.exports = router;
