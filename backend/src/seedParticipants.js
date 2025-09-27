require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const Participant = require("./models/Participant");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/vidyavichar_seed";

// Name pools
const firstNames = [
  "Aarav", "Ishaan", "Kabir", "Rohan", "Vihaan",
  "Ananya", "Diya", "Ira", "Meera", "Saanvi",
  "Arjun", "Dev", "Krishna", "Nikhil", "Rahul",
  "Priya", "Kavya", "Neha", "Simran", "Tanya"
];

const lastNames = [
  "Sharma", "Verma", "Gupta", "Iyer", "Nair",
  "Reddy", "Patel", "Das", "Khan", "Singh",
  "Chopra", "Bose", "Kapoor", "Malhotra", "Joshi",
  "Agarwal", "Menon", "Rastogi", "Pillai", "Dutta"
];

function randomName() {
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${first} ${last}`;
}

function makeEmail(name, usedEmails) {
  let base = name.toLowerCase().replace(/\s+/g, ".");
  let email = base + "@vidyavichar.com";
  let counter = 2;
  // ensure uniqueness
  while (usedEmails.has(email)) {
    email = `${base}${counter}@vidyavichar.com`;
    counter++;
  }
  usedEmails.add(email);
  return email;
}

async function seed() {
  try {
    console.log("Connecting to MongoDB:", MONGO_URI);
    await connectDB(MONGO_URI);

    const count = await Participant.countDocuments();
    if (count > 0) {
      await Participant.deleteMany({});
      console.log(`Cleared ${count} existing participants`);
    }

    const courseName = "System Design";
    const passwordHash = await bcrypt.hash("password123", 10);
    const docs = [];
    const usedEmails = new Set();

    // Instructor
    const instEmail = "instructor@vidyavichar.com";
    usedEmails.add(instEmail);
    docs.push({
      id: "inst001",
      name: "Prof. Arvind Rao",
      email: instEmail,
      passwordHash,
      role: "instructor",
      courses: [{ courseName, enrolled: true, isTA: false, isInstructor: true }]
    });

    // TAs
    const taNames = [
      "Ritika Sharma", "Manish Gupta", "Pooja Verma",
      "Suresh Iyer", "Alok Nair", "Sneha Patel"
    ];
    taNames.forEach((name, i) => {
      docs.push({
        id: `ta${(i + 1).toString().padStart(3, "0")}`,
        name,
        email: makeEmail(name, usedEmails),
        passwordHash,
        role: "student",
        courses: [{ courseName, enrolled: true, isTA: true, isInstructor: false }]
      });
    });

    // Enrolled students (100)
    for (let i = 1; i <= 100; i++) {
      const name = randomName();
      docs.push({
        id: `stu${i.toString().padStart(3, "0")}`,
        name,
        email: makeEmail(name, usedEmails),
        passwordHash,
        role: "student",
        courses: [{ courseName, enrolled: true, isTA: false, isInstructor: false }]
      });
    }

    // Not enrolled students (20)
    for (let i = 101; i <= 120; i++) {
      const name = randomName();
      docs.push({
        id: `stu${i.toString().padStart(3, "0")}`,
        name,
        email: makeEmail(name, usedEmails),
        passwordHash,
        role: "student",
        courses: []
      });
    }

    await Participant.insertMany(docs);
    console.log("Seeded participants successfully:", docs.length);
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

seed();
