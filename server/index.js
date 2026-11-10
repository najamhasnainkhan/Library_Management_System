import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import dashboardRoutes from "./routes/dashboard.js";
import bookRoutes from "./routes/books.js";
import categoryRoutes from "./routes/categories.js";
import memberRoutes from "./routes/members.js";
import loanRoutes from "./routes/loans.js";
import reservationRoutes from "./routes/reservations.js";
import fineRoutes from "./routes/fines.js";
import { seedIfEmpty } from "./seed.js";

const app = express();
app.set("trust proxy", 1);
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/fines", fineRoutes);

app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

// Serve the built client when running `npm start` in production.
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : "Something went wrong on the server" });
});

const port = Number(process.env.API_PORT) || 3001;
app.listen(port, () => {
  console.log(`API listening on ${port}`);
  seedIfEmpty()
    .then((created) => created && console.log("Seeded demo accounts and sample data"))
    .catch((err) => console.error("Seed skipped:", err.message));
});
