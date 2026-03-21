if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool, initDB } = require("./db");
const { authMiddleware, JWT_SECRET } = require("./authMiddleware");
const courses = require("./courses");

const app = express();
app.use(cors());
app.use(express.json());

// ── Auth Routes ──────────────────────────────────────────

app.post("/auth/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });
  if (password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  try {
    const hashed = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email",
      [email.toLowerCase().trim(), hashed]
    );
    const token = jwt.sign({ userId: rows[0].id }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, email: rows[0].email });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Email already registered" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });
  try {
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );
    if (!rows.length) return res.status(401).json({ error: "Invalid email or password" });
    const valid = await bcrypt.compare(password, rows[0].password);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });
    const token = jwt.sign({ userId: rows[0].id }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, email: rows[0].email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Protected Routes ─────────────────────────────────────

app.get("/courses", authMiddleware, (req, res) => {
  res.json(courses);
});

app.get("/progress/:id", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT done, revised, watched_seconds FROM progress WHERE user_id = $1 AND video_id = $2",
      [req.userId, req.params.id]
    );
    res.json(rows[0] || { done: 0, revised: 0, watched_seconds: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

app.post("/progress", authMiddleware, async (req, res) => {
  const { videoId, done, revised, watchedSeconds = 0 } = req.body;
  try {
    await pool.query(
      `INSERT INTO progress (user_id, video_id, done, revised, watched_seconds)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, video_id)
       DO UPDATE SET done = $3, revised = $4, watched_seconds = $5`,
      [req.userId, videoId, done, revised, watchedSeconds]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

// Lightweight route — only saves watch position, no done/revised change
app.post("/progress/watch", authMiddleware, async (req, res) => {
  const { videoId, watchedSeconds } = req.body;
  try {
    await pool.query(
      `INSERT INTO progress (user_id, video_id, done, revised, watched_seconds)
       VALUES ($1, $2, 0, 0, $3)
       ON CONFLICT (user_id, video_id)
       DO UPDATE SET watched_seconds = $3`,
      [req.userId, videoId, watchedSeconds]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

// ── Start ────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;

initDB()
  .then(() => app.listen(PORT, () => console.log(`Server running on :${PORT}`)))
  .catch((err) => {
    console.error("Failed to connect to database:", err.message);
    process.exit(1);
  });