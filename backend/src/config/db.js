// Connect to MongoDB
const mongoose = require("mongoose");

async function connectDB(uri) {
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  return mongoose;
}

module.exports = connectDB;
