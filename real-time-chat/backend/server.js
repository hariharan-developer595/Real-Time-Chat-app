require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const User = require("./models/User");
const Message = require("./models/Message");
const authRoutes = require("./routes/auth");

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

app.get("/", (req, res) => res.json({ message: "Chat server is running" }));
app.use("/api/auth", authRoutes);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"]
  }
});

const onlineUsers = new Map();

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication required"));
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", async (socket) => {
  const userId = socket.user.id;
  onlineUsers.set(userId, socket.id);

  await User.findByIdAndUpdate(userId, { online: true });
  io.emit("user_status", { userId, online: true });

  socket.on("send_message", async ({ receiverId, text }) => {
    try {
      if (!receiverId || !text?.trim()) return;

      const message = await Message.create({
        sender: userId,
        receiver: receiverId,
        text: text.trim()
      });

      const populated = await Message.findById(message._id)
        .populate("sender", "username")
        .populate("receiver", "username");

      const receiverSocket = onlineUsers.get(receiverId);
      if (receiverSocket) io.to(receiverSocket).emit("receive_message", populated);

      socket.emit("message_sent", populated);
    } catch (err) {
      socket.emit("chat_error", "Message could not be sent");
    }
  });

  socket.on("typing", ({ receiverId }) => {
    const receiverSocket = onlineUsers.get(receiverId);
    if (receiverSocket) io.to(receiverSocket).emit("typing", { userId });
  });

  socket.on("stop_typing", ({ receiverId }) => {
    const receiverSocket = onlineUsers.get(receiverId);
    if (receiverSocket) io.to(receiverSocket).emit("stop_typing", { userId });
  });

  socket.on("disconnect", async () => {
    onlineUsers.delete(userId);
    await User.findByIdAndUpdate(userId, { online: false, lastSeen: new Date() });
    io.emit("user_status", { userId, online: false });
  });
});

app.get("/api/messages/:userId", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const myId = decoded.id;
    const otherId = req.params.userId;

    const messages = await Message.find({
      $or: [
        { sender: myId, receiver: otherId },
        { sender: otherId, receiver: myId }
      ]
    })
      .sort({ createdAt: 1 })
      .populate("sender", "username")
      .populate("receiver", "username");

    await Message.updateMany(
      { sender: otherId, receiver: myId, seen: false },
      { $set: { seen: true } }
    );

    res.json(messages);
  } catch {
    res.status(401).json({ message: "Unauthorized" });
  }
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    server.listen(process.env.PORT, () =>
      console.log(`Server running on http://localhost:${process.env.PORT}`)
    );
  })
  .catch((err) => console.error("MongoDB connection failed:", err.message));
