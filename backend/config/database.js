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

function normalizeRows(rows) {
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

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return normalizeRows(rows);
}

async function getConnection() {
  return pool.getConnection();
}

async function testConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
    console.log(`MySQL connected (${process.env.DB_NAME || "hds_db"})`);
  } finally {
    connection.release();
  }
}

async function ensureDatabaseExists() {
  const databaseName = process.env.DB_NAME || "hds_db";
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    charset: "utf8mb4",
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await connection.end();
  }
}

function getDatabaseName() {
  return process.env.DB_NAME || "hds_db";
}

module.exports = {
  pool,
  query,
  getConnection,
  testConnection,
  ensureDatabaseExists,
  getDatabaseName,
};
