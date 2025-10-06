// src/lib/socket.js
import { io } from "socket.io-client";

// Use your backend messaging-service base URL here.
// When running locally:
const BASE_URL = import.meta.env.VITE_MSG_URL || "http://localhost:4304";

// Keep a single shared connection
let socket;

export function getSocket() {
  if (!socket) {
    socket = io(BASE_URL, {
      transports: ["websocket"],
      reconnection: true,
    });

    socket.on("connect", () => {
      console.log("[socket] connected", socket.id);
    });

    socket.on("disconnect", () => {
      console.warn("[socket] disconnected");
    });
  }
  return socket;
}
