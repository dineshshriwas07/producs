require('dotenv').config();
const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const db = require('./db');
const bodyParser = require("body-parser");
const session = require("express-session");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

   // Razorpay Instance
    const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    const uploadsDir = path.join(__dirname, "uploads");

    // Agar uploads folder exist nahi karta to create kar do
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir);
    }

    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, uploadsDir);
        },
        filename: function (req, file, cb) {
            const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, unique + path.extname(file.originalname).toLowerCase());
        }
    });

    const fileFilter = (req, file, cb) => {
        const allowed = /jpeg|jpg|png/;
        const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
        const mimeOk = allowed.test(file.mimetype);
        if (extOk && mimeOk) return cb(null, true);
        cb(new Error('Only JPG, JPEG, PNG allowed'));
    };

    const upload = multer({
        storage,
        // limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
        fileFilter
    });


    // Session Config (15 days)
    app.use(session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 15 * 24 * 60 * 60 * 1000 } // 15 days
    }));

    // Serve static files from public folder
    app.use(express.static("public"));
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(express.urlencoded({extended:false}))
    app.use(express.json());
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    // View Engine
    app.set('view engine', 'ejs');

    // user delevery code 
    function generateDeliveryCode() {
         return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // ===== Routes =====
    app.get('/', (req, res) => {
        const sql = 'SELECT * FROM products';
        db.query(sql, (err, result) => {
            if (err) throw err;
            res.render("index", { 
                products: result, 
                session: req.session  
            });
        });
    });


    app.get("/404", (req, res) => res.render("404"));

    app.get('/customerLogin', (req , res) =>{
        res.render("customerLogin" , { message: null, color: null })
    });

    app.get("/customerSignup", (req, res) => {
        res.render("customerSignup", { message: null, color: null });
    });

    app.get("/admin", (req, res) => {
        const key = req.query.key;

        if (req.session.adminKeyValid) {
            return res.render("admin", { message: null, color: null });
        }

        if (key !== process.env.ADMIN_SECRET_KEY) {
            return res.status(403).send("Unauthorized Access");
        }

        req.session.adminKeyValid = true;
        res.render("admin", { message: null, color: null });   
        // http://localhost:3000/admin?key=000
    });


    app.get('/produstbox' , (req , res)=>{
        res.render('produstbox');
    });

    app.get('/addProduct', (req, res) => {
        const sql = 'SELECT * FROM products';
        db.query(sql, (err, result) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).send("Internal Server Error");
            }
            res.render("addProduct", { products: result });
        });
    });

    // Edit Product get
    app.get('/editproduct/:id', (req, res) => {
        const productID = req.params.id;
        console.log("Requested Product ID:", productID);

        db.query("SELECT * FROM products WHERE id = ?", [productID], (err, result) => {
            if (err) {
                return res.status(500).send("Internal Server Error");
            }
            if (result.length === 0) {
                return res.status(404).send("Product not found"); 
            }
            const product = result[0];
            //  Ab sirf ek hi response
            res.render('editProduct', { product });
        });
    });

    // Logout route get
    app.get('/adminlogout', (req, res) => {
        req.session.destroy(() => {
            res.redirect('/');
        });
    });

    // user dashboard get
    app.get('/user-dashboard', (req, res) => {
        if (!req.session.user) {
            return res.redirect('/customerLogin');
        }

        const { email, phone } = req.session.user;

        const sql = `
            SELECT *, 
                TIMESTAMPDIFF(HOUR, created_at, NOW()) AS hours_passed 
            FROM orders 
            WHERE customerEmail = ? OR customerMobile = ?
            ORDER BY created_at DESC
        `;

        db.query(sql, [email, phone], (err, orders) => {
            if (err) {
                console.error("DB Error:", err);
                return res.status(500).send("Database error");
            }

            res.render('user-dashboard', { 
                session: req.session, 
                orders 
            });
        });
    });
  
    app.get('/buyNow/:id', (req, res) => {
        if (!req.session.user) {
            return res.redirect('/customerLogin');
        }

        const productID = req.params.id;
        const userID = req.session.user.id;

        // product fetch
        const sqlProduct = "SELECT * FROM products WHERE id = ?";
        db.query(sqlProduct, [productID], (err, productResult) => {
            if (err || productResult.length === 0) {
                return res.status(404).send("Product not found");
            }

            // user fetch
            const sqlUser = "SELECT name, email, phone FROM customers_login WHERE id = ?";
            db.query(sqlUser, [userID], (err, userResult) => {
                if (err || userResult.length === 0) {
                    return res.status(404).send("User not found");
                }

                res.render('buyNow', { 
                    product: productResult[0], 
                    customer: userResult[0],
                    session: req.session,
                    razorpayKeyId: process.env.RAZORPAY_KEY_ID
                });
            });
        });
    });

    // get contact us 
    app.get('/about' , (req , res)=>{
        res.render('about' , { session: req.session });
    });

    // get gallery 
    app.get('/gallery' , (req , res)=>{
        res.render('gallery' , { session: req.session });
    });

    // get contact us 
    app.get('/contact' , (req , res)=>{
        res.render('contact' , { session: req.session });
    });

    // get coalwork us 
    app.get('/coalwork' , (req , res)=>{
        res.render('coalwork' , { session: req.session });
    });

    // get iron-ore-work 
    app.get('/iron-ore-work' , (req , res)=>{
        res.render('iron-ore-work' , { session: req.session });
    });

    // get mining-solutions transportation-work
    app.get('/mining-solutions' , (req , res)=>{
        res.render('mining-solutions' , { session: req.session });
    });

    // get transportation-work 
    app.get('/transportation-work' , (req , res)=>{
        res.render('transportation-work' , { session: req.session });
    });

    // Step 1: Check mobile OR email
    app.post('/check-mob', (req, res) => {
        const { identifier } = req.body;

        const query = "SELECT * FROM customers_login WHERE phone = ? OR email = ?";
        db.query(query, [identifier, identifier], (err, results) => {
            if (err) {
                return res.json({ success: false, message: "Database error" });
            }
            if (results.length > 0) {
                req.session.userContact = identifier; 
               return res.render('forgetpassword', { session: req.session, message: null, color: null });
            } else {
                return res.redirect('/customerLogin');
            }
        });
    });

    // Step 2: Reset password
    app.post('/resetPassword', (req, res) => {
        const { newPassword, confirmPassword } = req.body;
        const userContact = req.session.userContact;   

        if (!userContact) {
            return res.render('customerLogin', { 
                message: "Session expired. Please try again.", 
                color: "red", 
                alertType: 'danger' 
            });
        }

        if (newPassword !== confirmPassword) {
            return res.render('forgetpassword', {  
                message: "Passwords do not match", 
                alertType: 'danger', 
                session: req.session 
            });
        }

        const sql = "SELECT * FROM customers_login WHERE phone = ? OR email = ?";
        db.query(sql, [userContact, userContact], (err, results) => {
            if (err) {
                return res.render('forgetpassword', { message: "Database error", alertType: 'danger', session: req.session });
            }

            if (results.length === 0) {
                return res.render('forgetpassword', { message: "Account not found", alertType: 'warning', session: req.session });
            }

            const update = "UPDATE customers_login SET password = ?, confirmPassword = ? WHERE phone = ? OR email = ?"; 
            db.query(update, [newPassword, confirmPassword, userContact, userContact], (err2) => {
                if (err2) {
                    return res.render('forgetpassword', { message: "Error updating password", alertType: 'danger', session: req.session });
                }

                req.session.userContact = null; 
                return res.render('customerLogin', { 
                    message: "Password updated successfully! Login Now", 
                    color: "green", 
                    alertType: 'success' 
                });
            });
        });
    });

    // Create Razorpay Order
    app.post('/createOrder', async (req, res) => {
    if(!req.session.user) return res.status(401).json({ error: "Login first" });

    const { totalAmount, productName } = req.body;

    try {
        const options = {
        amount: totalAmount * 100,
        currency: "INR",
        receipt: `receipt_${Date.now()}`
        };
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch(err) {
        // console.error(err);
        res.status(500).json({ error: "Failed to create order" });
    }
    });

    app.post('/verifyPayment', (req, res) => {
        const {
            id, productName, price, quantity, totalAmount,
            customerName, customerEmail, customerMobile, customerAddress,
            razorpay_order_id, razorpay_payment_id, razorpay_signature
        } = req.body;

        const generated_signature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');

        if (generated_signature === razorpay_signature) {
            const deliveryCode = generateDeliveryCode();

            const sql = `INSERT INTO orders 
            (id, productName, price, quantity, totalAmount, customerName, customerEmail, customerMobile, customerAddress, 
            delivery_code, status, razorpay_order_id, razorpay_payment_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            const values = [
                id, productName, price, quantity, totalAmount,
                customerName, customerEmail, customerMobile, customerAddress,
                deliveryCode, 'Processing', razorpay_order_id, razorpay_payment_id
            ];

            db.query(sql, values, (err, result) => {
                if (err) return res.status(500).json({ error: "Database error" });
                res.json({ success: true, message: "Order placed successfully!" });
            });
        } else {
            res.status(400).json({ error: "Payment verification failed or cancelled" });
        }
    });

    // Jab order cancel ho
    function refundPayment(paymentId, amount) {
        return razorpay.payments.refund(paymentId, {
            amount: amount * 100  // paisa me hota hai (₹100 = 10000)
        });
    }

    // cancel bookikng
    app.post("/cancel-order/:id", async (req, res) => {
        const orderId = req.params.id;

        db.query("SELECT * FROM orders WHERE id = ?", [orderId], async (err, result) => {
            if (err || result.length === 0) {
                return res.json({ success: false, message: "Order not found" });
            }

            const order = result[0];

            if (!order.razorpay_payment_id) {
                return res.json({ success: false, message: "Payment ID missing" });
            }

            try {
                // Refund API call
                const refund = await razorpay.payments.refund(order.razorpay_payment_id, {
                    amount: order.totalAmount * 100, // amount in paise
                    speed: "optimum",
                    receipt: "refund_" + orderId,
                });

                //  Update DB (Sirf "Cancelled" status rakhenge)
                db.query(
                    "UPDATE orders SET status=?, razorpay_refund_id=? WHERE id=?",
                    ["Cancelled", refund.id, orderId],
                    (updateErr) => {
                        if (updateErr) {
                            return res.json({ success: false, message: "Database update failed" });
                        }
                        return res.json({ success: true, message: "Order cancelled & refund successful", refund });
                    }
                );
            } catch (error) {
                return res.json({ success: false, message: "Refund failed", error });
            }
        });
    });


    //-----------------ADMIN QUERYS---------------------

    // ===== ADMIN Dashboard Get =====
    app.get('/admin_dashboard', (req, res) => {
        if (!req.session.adminKeyValid) {
            return res.redirect('/admin');
        }

        // Products fetch
        const sqlProducts = 'SELECT * FROM products';
        db.query(sqlProducts, (err, products) => {
            if (err) return res.status(500).send("DB Error: " + err);

            // Orders fetch
            const sqlOrders = 'SELECT * FROM orders ORDER BY created_at DESC';
            db.query(sqlOrders, (err2, orders) => {
                if (err2) return res.status(500).send("DB Error: " + err2);

                // Total Orders
                const totalOrders = orders.length;

                // Today Orders
                const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
                const todayOrders = orders.filter(o => o.created_at.toISOString().slice(0,10) === today).length;

                // Today Delivered Orders
                const todayDelivered = orders.filter(
                    o => o.status === "Delivered" && o.delivered_at && o.delivered_at.toISOString().slice(0,10) === today
                ).length;

                // Total Sales (sum of totalAmount of delivered)
                const totalSales = orders.reduce((sum, o) => {
                    if (o.status === "Delivered") return sum + (o.totalAmount || 0);
                    return sum;
                }, 0);

                // Render with all data
                res.render("admin_dashboard", { 
                    products, 
                    orders,
                    totalOrders,
                    todayOrders,
                    todayDelivered,  
                    totalSales
                });
            });
        });
    });

    // ===== ADMIN LOGIN =====
    app.post('/admin_login_form', (req, res) => {
        const { NameOrEmail, password } = req.body;

        const sql = 'SELECT * FROM admin_login WHERE (name = ? OR email = ?) AND password = ?';
        db.query(sql, [NameOrEmail, NameOrEmail, password], (err, result) => {
            if (err) {
                console.error("DB Error:", err);
                return res.status(500).send("Database error");
            }

            if (result.length > 0) {
                req.session.adminKeyValid = result[0]; 

                // 1st query - products
                const sql2 = 'SELECT * FROM products';
                db.query(sql2, (err2, products) => {
                    if (err2) return res.status(500).send("Database error");

                    // 2nd query - orders
                    const sql3 = `SELECT * FROM orders ORDER BY created_at DESC`;
                    db.query(sql3, (err3, orders) => {
                        if (err3) return res.status(500).send("Database error");

                        // 3rd query - total sales (only Delivered)
                        const sql4 = "SELECT SUM(totalAmount) AS totalSales FROM orders WHERE status='Delivered'";
                        db.query(sql4, (err4, salesResult) => {
                            if (err4) return res.status(500).send("Database error");

                            // 4th query - today orders
                            const sql5 = "SELECT COUNT(*) AS todayOrders FROM orders WHERE DATE(created_at) = CURDATE()";
                            db.query(sql5, (err5, todayResult) => {
                                if (err5) return res.status(500).send("Database error");

                                // 5th query - total orders
                                const sql6 = "SELECT COUNT(*) AS totalOrders FROM orders";
                                db.query(sql6, (err6, totalOrdersResult) => {
                                    if (err6) return res.status(500).send("Database error");

                                    // ✅ 6th query - today delivered
                                    const sql7 = "SELECT COUNT(*) AS todayDelivered FROM orders WHERE status='Delivered' AND DATE(delivered_at) = CURDATE()";
                                    db.query(sql7, (err7, todayDeliveredResult) => {
                                        if (err7) return res.status(500).send("Database error");

                                        const totalSales = salesResult[0].totalSales || 0;
                                        const todayOrders = todayResult[0].todayOrders || 0;
                                        const totalOrders = totalOrdersResult[0].totalOrders || 0;
                                        const todayDelivered = todayDeliveredResult[0].todayDelivered || 0;

                                        // Render dashboard with all data
                                        return res.render('admin_dashboard', { 
                                            message: null, 
                                            color: null, 
                                            products, 
                                            orders,
                                            totalSales,
                                            todayOrders,
                                            totalOrders,
                                            todayDelivered   // 👈 add kiya
                                        });
                                    });
                                });
                            });
                        });
                    });
                });

            } else {
                res.render("admin", { 
                    message: "Invalid Username/Email or Password", 
                    color: "red" 
                });
            }
        });
    });

    // ===== Add Produts =====
    app.post('/addProduct', upload.single('ProImage'), (req, res) => {
        try {
            const { title, price, originalPrice, description } = req.body;
            const file = req.file;

            if (!title || !price || !originalPrice || !description || !file) {
                res.redirect('/addProduct');
            }

            const numericPrice = parseFloat(price);
            const numericOriginal = parseFloat(originalPrice) || null;

            if (isNaN(numericPrice) || numericPrice < 0 || (numericOriginal !== null && numericOriginal < 0)) {
                res.redirect('/addProduct');
            }

            const sql = `INSERT INTO products (title, ProImage, price, originalPrice, description) VALUES (?, ?, ?, ?, ?)`;
            const params = [title.trim(), file.filename, numericPrice, numericOriginal, description.trim()];

            db.query(sql, params, (err, result) => {
                if (err) {
                    try { fs.unlinkSync(path.join(uploadsDir, file.filename)); } catch (_) { }
                    return res.status(500).send('DB error: ');
                }
                return res.redirect('/admin_dashboard');
            });

        } catch (e) {
            res.status(500).send('Server error.');
        }
    });

    // delete Products 
    app.get('/deleteProduct/:id', (req, res) => {
        const productID = req.params.id;

        db.query('SELECT ProImage FROM products WHERE id = ?', [productID], (err, result) => {
            if (err || result.length === 0) return res.send("Product not found");

            const imageName = result[0].ProImage;
            const imgPath = path.join(__dirname, 'uploads', imageName);

            if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);

            db.query('DELETE FROM products WHERE id = ?', [productID], (err2) => {
                res.redirect('/admin_dashboard');
            });
        });
    });

    // Update Product
    app.post('/updateproduct/:id', upload.single('ProImage'), (req, res) => {
        const productID = req.params.id;
        let { title, price, originalPrice, description } = req.body;
        const newImage = req.file ? req.file.filename : null;

        // convert prices properly
        price = parseFloat(price);
        originalPrice = parseFloat(originalPrice) || null;

        if (!title || isNaN(price)) {
            return res.status(400).send("Invalid data");
        }

        db.query("SELECT ProImage FROM products WHERE id = ?", [productID], (err, result) => {
            if (err) {
                return res.status(500).send("Database error");
            }
            if (result.length === 0) {
                return res.status(404).send("Product not found");
            }

            const oldImage = result[0].ProImage;

            if (newImage) {
                const oldImagePath = path.join(__dirname, "uploads", oldImage);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }

                // Update with new image
                db.query(
                    "UPDATE products SET title=?, price=?, originalPrice=?, description=?, ProImage=? WHERE id=?",
                    [title.trim(), price, originalPrice, description.trim(), newImage, productID],
                    (err2) => {
                        if (err2) {
                            return res.status(500).send("Failed to update product");
                        }
                        if (req.session && req.session.admin) {
                            return res.redirect('/admin_dashboard');
                        } else {
                            return res.redirect(`/admin?key=${process.env.ADMIN_REDIRECT_KEY}`);
                        }
                    }
                );
            } else {
                // Update without new image
                db.query(
                    "UPDATE products SET title=?, price=?, originalPrice=?, description=? WHERE id=?",
                    [title.trim(), price, originalPrice, description.trim(), productID],
                    (err2) => {
                        if (err2) {
                            return res.status(500).send("Failed to update product");
                        }
                        if (req.session && req.session.admin) {
                            return res.redirect('/admin_dashboard');
                        } else {
                            return res.redirect('/admin_dashboard');
                        }
                    }
                );
            }
        });
    });

    // purchaseForm
    app.post('/purchaseForm', (req, res) => {
        if(!req.session.user) {
            return res.redirect('/customerLogin');
        }

        const userId = req.session.user.id; // Logged-in user id
        const {id, productName, price, quantity, totalAmount, customerName, customerEmail, customerMobile, customerAddress} = req.body;

        const deliveryCode = generateDeliveryCode();

        const sql = `INSERT INTO orders 
        (id, productName, price, quantity, totalAmount, customerName, customerEmail, customerMobile, customerAddress, delivery_code, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const values = [
            id, productName, price, quantity, totalAmount,
            customerName, customerEmail, customerMobile, customerAddress,
            deliveryCode, 'Processing'
        ];


        db.query(sql, values, (err, result) => {
            if(err) {
                // console.error(err);
                return res.status(500).send("Database error");
            }
             res.redirect('/buysuccessfuly');
        });
    });


    //-----------------CUSTOMER QUERYS------------------

    // ===== QUERYS SIGNUP =====
    app.post('/user_signup', (req, res) => {
        const { name, lastName, email, phone, password, confirmPassword } = req.body;

        // Password match check
        if (password !== confirmPassword) {
            return res.render('customerSignup', { 
                message: "Passwords do not match", 
                color: "red" 
            });
        }

        // Check email/mobile already exist
        const checkSql = "SELECT * FROM customers_login WHERE email = ? OR phone = ?";

        db.query(checkSql, [email, phone], (err, result) => {
            if (err) {
                // console.error("DB Error:", err);
                return res.status(500).send("Database error");
            }

            if (result.length > 0) {
                // Duplicate email/phone found
                return res.render('customerSignup', { 
                    message: "Email or Phone already exists", 
                    color: "red" 
                });
            } else {
                // Insert new record
                const insertSql = `
                    INSERT INTO customers_login (name, lastName, email, phone, password, confirmPassword) 
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                db.query(insertSql, [name, lastName, email, phone, password, confirmPassword], (err2) => {
                    if (err2) {
                        // console.error("Insert Error:", err2);
                        return res.status(500).send("Failed to register user");
                    }

                    // Success → redirect or show login page
                    return res.render('customerLogin', { 
                        message: "Successfully Registered, Please Login", 
                        color: "green" 
                    });
                });
            }
        });
    });

    // ===== QUERYS LOGIN =====
    app.post('/user_login' , (req , res) =>{
        const {emailOrPhone, password} = req.body;
        const sql = 'SELECT * FROM customers_login WHERE (email = ? OR phone = ?) AND password = ?';
        
        db.query(sql,[emailOrPhone, emailOrPhone, password] , (err , result) =>{
            if (err) return res.render('customerLogin', { message: "Server error.", color: "red" });
            if (result.length > 0) {
                req.session.user = result[0];
                return res.redirect('/');
            } else {
                return res.render('customerLogin', { message: "Invalid credentials", color: "red" });
            }
        });
    });

    // ===== QUERYS LOGOUT =====
    app.get('/logout', (req, res) => {
        req.session.destroy(() => {
            res.redirect('/');
        });
    });

    app.get('/delivery-verify' ,  (req , res)=>{
        res.render('delivery-verify', { message: null, color: null });
    });

    // Delivery verify route
    app.post('/delivery-verify', (req, res) => {
        const { identifier, code } = req.body;

        console.log("Delivery verify request:", identifier, code);

        // identifier = customerEmail ya customerMobile
        const findSql = `
            SELECT * FROM orders 
            WHERE (customerEmail = ? OR customerMobile = ?) 
            AND delivery_code = ? 
            AND status = 'Processing'
            ORDER BY created_at DESC
            LIMIT 1
        `;

        db.query(findSql, [identifier, identifier, code], (err, rows) => {
            if (err) {
                console.log("DB find error:", err);
                return res.render('delivery-verify', { message: "Server error", color: "red" });
            }

            if (!rows || rows.length === 0) {
                console.log("No matching order found for verification");
                return res.render('delivery-verify', { message: "Invalid code or already verified.", color: "red" });
            }

            const orderRow = rows[0];
            console.log("Order found for verification:", orderRow.id, orderRow.status);

            // Update order status to Delivered
            const updateSql = `
                UPDATE orders 
                SET status = 'Delivered', delivered_at = NOW() 
                WHERE id = ? AND delivery_code = ?
            `;

            db.query(updateSql, [orderRow.id, code], (err2, result) => {
                if (err2) {
                    console.log("DB update error:", err2);
                    return res.render('delivery-verify', { message: "Could not update status.", color: "red" });
                }

                console.log("Order updated successfully:", orderRow.id, result);

                return res.render('delivery-verify', { 
                    message: "Delivery confirmed. Order marked as Delivered.", 
                    color: "green" 
                });
            });
        });
    });



// ===== Server Start =====
app.listen(PORT, () => {
    console.log(" Server running on http://localhost:3000");
});
