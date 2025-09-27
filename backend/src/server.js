const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const app = require("./app");
require("dotenv").config();

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    const server = http.createServer(app);

    const io = new Server(server, {
      cors: { origin: true, credentials: true }
    });

    // socket handlers (this will call setIo inside)
    require("./sockets")(io);

    server.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
}

start();
