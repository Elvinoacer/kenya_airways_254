#!/usr/bin/env ts-node
/**
 * Lightweight Socket.IO server to run alongside the app.
 * Usage: `node scripts/socket-server.js` (transpile or run via ts-node).
 * Listens on port from env SOCKET_PORT (default 4001).
 */
import http from "http";
// @ts-ignore - optional dependency
import { Server as IOServer } from "socket.io";

const port = Number(process.env.SOCKET_PORT || 4001);

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Socket server running\n");
});

const io = new IOServer(server, {
  cors: { origin: process.env.SOCKET_CORS_ORIGIN || "*" },
});

io.on("connection", (socket: any) => {
  console.log("socket connected", socket.id);
  // presence: client may send { userId }
  socket.on("presence:join", (payload: any) => {
    const { userId } = payload || {};
    if (userId) {
      socket.join(`presence:${userId}`);
      socket.data.userId = userId;
      socket.broadcast.emit("presence", { userId, status: "online" });
    }
  });

  socket.on("disconnect", () => {
    const userId = socket.data?.userId;
    if (userId)
      socket.broadcast.emit("presence", { userId, status: "offline" });
    console.log("socket disconnected", socket.id, userId);
  });

  // proxy basic events to broadcast
  socket.on("seat_update", (p: any) => io.emit("seat_update", p));
  socket.on("booking_change", (p: any) => io.emit("booking_change", p));
  socket.on("notification", (p: any) =>
    io.to(p.userId ? `presence:${p.userId}` : "").emit("notification", p),
  );
  socket.on("flight_status", (p: any) => io.emit("flight_status", p));
  socket.on("assignment_update", (p: any) => io.emit("assignment_update", p));
});

server.listen(port, () => console.log(`Socket.IO server listening on ${port}`));
