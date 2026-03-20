const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      email      TEXT UNIQUE NOT NULL,
      password   TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS progress (
      user_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
      video_id  TEXT NOT NULL,
      done      INTEGER DEFAULT 0,
      revised   INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, video_id)
    )
  `);

  console.log("✓ Database ready");
};

module.exports = { pool, initDB };