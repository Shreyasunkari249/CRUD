const sql = require('mysql2')

const db = sql.createConnection({
  host: "localhost",
  user: "root",
  password: "Root",
  database: "amazon",
});

module.exports = db;