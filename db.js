const mysql = require('mysql');

const conn = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

conn.connect((err) => {

    // if(err) throw err ; 
    // console.log("successfully contected database:");

    // |||- Query For Products -|||

    // 1 . create database :
    // conn.query("CREATE DATABASE eco_motion",(err,result)=>{
    //     if(err) throw err;
    //     console.log('created my database',result);
    // });

    // 2 . create products table:
    // const createTable = `
    //         CREATE TABLE IF NOT EXISTS products (
    //             id INT AUTO_INCREMENT PRIMARY KEY,
    //             title VARCHAR(255),
    //             price DECIMAL(10,2),
    //             originalPrice DECIMAL(10,2),
    //             description TEXT
    //         )
    // `;
    // conn.query(createTable , (err , result) => {
    //     if(err) throw err ; 
    //     console.log("successfully contected table:");
    // });

    // 3 . create customers_login table:
    // const createTable = `
    //         CREATE TABLE IF NOT EXISTS customers_login (
    //             id INT AUTO_INCREMENT PRIMARY KEY,
    //             name VARCHAR(50),
    //             lastName VARCHAR(50),
    //             email VARCHAR(255),
    //             phone VARCHAR(50),
    //             password VARCHAR(255)
    //         )
    // `;
    // conn.query(createTable , (err , result) => {
    //     if(err) throw err ; 
    //     console.log("successfully contected table:" , result);
    // });

    // const createTable = `
    // CREATE TABLE products (
    //     id INT AUTO_INCREMENT PRIMARY KEY,
    //     title VARCHAR(255),
    //     price DECIMAL(10,2),
    //     description TEXT,
    //     image VARCHAR(255)
    // )
    // `;

    // let sql = 'DROP TABLE products';
    // conn.query(sql,(err , result)=>{
    //     if(err) throw err;
    //     console.log("delete table");
    // });

    // const sql = `
    // CREATE TABLE IF NOT EXISTS products (
    //     id INT AUTO_INCREMENT PRIMARY KEY,
    //     title VARCHAR(255) NOT NULL,
    //     image VARCHAR(255) NOT NULL,          
    //     price DECIMAL(10,2) NOT NULL,
    //     originalPrice DECIMAL(10,2) NULL,
    //     description TEXT NOT NULL,
    //     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    // );`

    //     conn.query(sql,(err , result)=>{
    //     if(err) throw err;
    //     console.log("delete table");
    // });

    // order table  :

    // const sql = `
    //     CREATE TABLE orders (
    //         id INT AUTO_INCREMENT PRIMARY KEY,
    //         productName VARCHAR(255) NOT NULL,
    //         price DECIMAL(10,2) NOT NULL,
    //         quantity INT NOT NULL,
    //         totalAmount DECIMAL(10,2) NOT NULL,
    //         customerName VARCHAR(255) NOT NULL,
    //         customerEmail VARCHAR(255),
    //         customerMobile VARCHAR(20),
    //         customerAddress TEXT,
    //         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    // )`;

    // // const sql = 'DROP TABLE orders';
    // conn.query(sql,(err , result)=>{
    //     if(err) throw err;
    //     console.log("delete table");
    // });

    // const sql = 'ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_code VARCHAR(6)';

    // const sql = `ALTER TABLE orders 
    //     ADD COLUMN razorpay_order_id VARCHAR(255),
    //     ADD COLUMN razorpay_payment_id VARCHAR(255),
    //     ADD COLUMN razorpay_refund_id VARCHAR(255)
    // `;
    // conn.query(sql , (err , result)=>{
    //     if(err) throw err ; 
    //     console.log("ADD COLUMN");
    // });

    // const sql = "ALTER TABLE orders MODIFY status ENUM('Processing','Delivered','Cancelled') NOT NULL DEFAULT 'Processing'";
    // conn.query(sql , (err , result)=>{
    //     if(err) throw err ; 
    //     console.log("update");
    // });




});

module.exports = conn;
