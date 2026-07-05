// mock-server/src/index.ts
// Single-port server: REST on http://localhost:4000, WebSocket on ws://localhost:4000/ws

import http from "http";
import express, { Request, Response } from "express";
import { WebSocketServer, WebSocket } from "ws";
import { RAW_TASKS, SUMMARIES, TASK_IDS, RawTask } from "./data";

const PORT = 4000;

// ─── Express App ─────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// CORS — allow the Next.js dev server to call the mock API
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  next();
});

// ─── REST: GET /api/tasks ─────────────────────────────────────────────────────

app.get("/api/tasks", (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
  const pageSize = Math.min(
    50,
    Math.max(1, parseInt(String(req.query.pageSize ?? "10"), 10))
  );
  const total = RAW_TASKS.length;
  const start = (page - 1) * pageSize;
  const items: RawTask[] = RAW_TASKS.slice(start, start + pageSize);

  res.json({ page, pageSize, total, items });
});

// ─── REST: GET /api/tasks/:id/summary (SSE streaming) ────────────────────────

app.get("/api/tasks/:id/summary", (req: Request, res: Response) => {
  const { id } = req.params;
  const summary = SUMMARIES[id];

  if (!summary) {
    res.status(404).json({ error: "Summary not found" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Split summary into word-sized chunks for realistic streaming
  const words = summary.split(" ");
  let index = 0;

  const interval = setInterval(() => {
    if (index >= words.length) {
      res.write("data: [DONE]\n\n");
      clearInterval(interval);
      res.end();
      return;
    }

    // Send 1–3 words per tick for natural feel
    const chunk = words.slice(index, index + 2).join(" ") + " ";
    res.write(`data: ${chunk}\n\n`);
    index += 2;
  }, 80);

  // Clean up if client disconnects mid-stream
  req.on("close", () => clearInterval(interval));
});

// ─── HTTP Server ──────────────────────────────────────────────────────────────

const server = http.createServer(app);

// ─── WebSocket Server (ws://localhost:4000/ws) ────────────────────────────────

const wss = new WebSocketServer({ noServer: true });

// Upgrade only requests targeting /ws — all others remain HTTP
server.on("upgrade", (req, socket, head) => {
  if (req.url === "/ws") {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  } else {
    socket.destroy();
  }
});

function broadcast(data: object): void {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on("connection", (ws) => {
  console.log("[ws] Client connected");
  ws.on("close", () => console.log("[ws] Client disconnected"));
});

// ─── Periodic WebSocket events ────────────────────────────────────────────────

const WS_STATUSES = [
  "in_progress",
  "TODO",
  "QA",
  "DONE",
  "BLOCKED",
  "inprogress",
];

// Emit task.updated every 4s
setInterval(() => {
  const id = TASK_IDS[Math.floor(Math.random() * TASK_IDS.length)];
  const status = WS_STATUSES[Math.floor(Math.random() * WS_STATUSES.length)];
  broadcast({
    kind: "task.updated",
    payload: { id, status, updatedAt: Date.now() },
  });
}, 4_000);

// Emit task.assigned every 7s
setInterval(() => {
  const id = TASK_IDS[Math.floor(Math.random() * TASK_IDS.length)];
  const assignees = [
    { id: "u1", name: "Priya Sharma" },
    { id: "u2", name: "Arjun Mehta" },
    null,
  ];
  const assignee = assignees[Math.floor(Math.random() * assignees.length)];
  broadcast({ kind: "task.assigned", payload: { id, assignee } });
}, 7_000);

// Emit annotation.created every 5s
setInterval(() => {
  const taskId = TASK_IDS[Math.floor(Math.random() * TASK_IDS.length)];
  broadcast({
    kind: "annotation.created",
    payload: { taskId, by: "u" + Math.ceil(Math.random() * 4), at: Date.now() },
  });
}, 5_000);

// ─── Start ────────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`\n🚀 Mock server running`);
  console.log(`   REST  → http://localhost:${PORT}/api/tasks`);
  console.log(`   WS    → ws://localhost:${PORT}/ws`);
  console.log(`   SSE   → http://localhost:${PORT}/api/tasks/:id/summary\n`);
});
