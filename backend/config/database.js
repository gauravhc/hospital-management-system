const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "hds_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "Z",
  charset: "utf8mb4",
});

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  if (rows && !Array.isArray(rows) && typeof rows === "object" && !rows[Symbol.iterator]) {
    Object.defineProperty(rows, Symbol.iterator, {
      enumerable: false,
      configurable: false,
      writable: false,
      value: function* iterator() {
        yield rows;
      },
    });
  }
  return rows;
}

async function getConnection() {
  return pool.getConnection();
}

async function testConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
    console.log("MySQL connected");
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  query,
  getConnection,
  testConnection,
};
