// socket.io handlers: session rooms join/leave
module.exports = (io) => {
  // set io into socket singleton so controllers can use it
  const { setIo } = require("../socket");
  setIo(io);

  io.on("connection", (socket) => {
    console.log("🔌 socket connected:", socket.id);

    socket.on("joinSession", (sessionId) => {
      socket.join(sessionId);
      console.log(`→ socket ${socket.id} joined session ${sessionId}`);
    });

    socket.on("leaveSession", (sessionId) => {
      socket.leave(sessionId);
      console.log(`← socket ${socket.id} left session ${sessionId}`);
    });

    socket.on("disconnect", () => {
      console.log("❌ socket disconnected:", socket.id);
    });
  });
};
