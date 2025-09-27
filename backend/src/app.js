const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const questionRoutes = require("./routes/questionRoutes");
const replyRoutes = require("./routes/replyRoutes");
const updateRoutes = require("./routes/updateRoutes");
const userRoutes = require("./routes/userRoutes"); // 1. Import user routes

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/replies", replyRoutes);
app.use("/api/updates", updateRoutes);
app.use("/api/users", userRoutes); // 2. Use user routes

app.get("/", (req, res) => res.send("VidyaVichar API"));

module.exports = app;