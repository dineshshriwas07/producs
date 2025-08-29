const mysql = require('mysql');

const conn = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

conn.connect((err) => {
    conn.getConnection((err, conn) => {
    if (err) {
        console.error("Database connection failed:", err);
    } else {
        console.log("✅ Database connected!");
        conn.release();
    }
    });

});

module.exports = conn;
