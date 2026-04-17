const mysql = require("mysql2/promise");

const db = mysql.createPool(process.env.MYSQL_PUBLIC_URL);

module.exports = db;