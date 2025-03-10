import { Server } from "socket.io";
import http from "http";
import express from "express";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

export const getRecieverSocketId = (receiverId: string) => {
  return users[receiverId];
};

const users: { [key: string]: string } = {};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  const userId = socket.handshake.query.id as string;

  if (userId) {
    users[userId] = socket.id;
    io.emit("fetchActiveUsers", Object.keys(users));
  }

  socket.on("disconnect", async () => {
    console.log(`User disconnected: ${socket.id}`);

    if (userId) {
      try {
        const lastActive = new Date();

        await prisma.user.update({
          where: { id: userId },
          data: { lastActive },
        });

        io.emit("userDisconnected", { userId, lastActive });
      } catch (error) {
        console.error(`Error updating lastActive for user ${userId}:`, error);
      }

      delete users[userId];
      io.emit("fetchActiveUsers", Object.keys(users));
    }
  });
});

export { app, io, server };
