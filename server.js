const path = require("path");
const http = require("http");
const socket = require("socket.io");
const express = require("express");

const formatMessage = require("./utils/messages");
const {
  userJoin,
  getCurrentUserByID,
  userLeave,
  getRoomUsers,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socket(server);

// static folder
app.use(express.static(path.join(__dirname, "public")));

const botName = "ChatRoom Bot";

// Run when a client connects
io.on("connection", (socket) => {
  socket.on("joinRoom", ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome a new user
    socket.emit("message", formatMessage(botName, "Welcome to ChatRoom"));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    // Send users and room info
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });

  // Listen for chat message
  socket.on("chatMessage", (msg) => {
    const user = getCurrentUserByID(socket.id);
    io.emit("message", formatMessage(`${user.username}`, msg));
  });

  // Run when client disconnects
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);
    if (user) {
      io.to(user.room).emit(
        "message",
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

const port = 3000 || process.env.PORT;

server.listen(port, () => console.log(`Server runs on port ${port}`));
