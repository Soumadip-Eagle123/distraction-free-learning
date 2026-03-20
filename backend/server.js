if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const cors = require("cors");
const { pool, initDB } = require("./db");
const courses = require("./courses");

const app = express();
app.use(cors());
app.use(express.json());

// ── Routes ──────────────────────────────────────────────

app.get("/courses", (req, res) => {
  res.json(courses);
});

app.get("/progress/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT done, revised FROM progress WHERE video_id = $1",
      [req.params.id]
    );
    res.json(rows[0] || { done: 0, revised: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

app.post("/progress", async (req, res) => {
  const { videoId, done, revised } = req.body;
  try {
    await pool.query(
      `INSERT INTO progress (video_id, done, revised)
       VALUES ($1, $2, $3)
       ON CONFLICT (video_id)
       DO UPDATE SET done = $2, revised = $3`,
      [videoId, done, revised]
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
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on :${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to connect to database:", err.message);
    process.exit(1);
  });