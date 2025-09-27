const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { markSeen, getUpdates } = require("../controllers/updateController");

router.post("/:sessionId/seen", auth, markSeen);
router.get("/:sessionId", auth, getUpdates);

module.exports = router;
