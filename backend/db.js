const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Runs once on server start — safe to run every time (IF NOT EXISTS)
const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS progress (
      video_id  TEXT PRIMARY KEY,
      done      INTEGER DEFAULT 0,
      revised   INTEGER DEFAULT 0
    )
  `);
  console.log("✓ Database ready");
};

module.exports = { pool, initDB };