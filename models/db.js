const mysql = require("mysql2/promise");

const db = mysql.createPool({
  uri: process.env.MYSQL_PUBLIC_URL,
  charset: "utf8mb4",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = db;