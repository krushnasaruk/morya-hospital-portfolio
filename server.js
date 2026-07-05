require("dotenv").config();
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(__dirname));

/**
 * GET /api/config
 * Safely expose the public Razorpay Key ID to the frontend
 */
app.get("/api/config", (req, res) => {
  if (!process.env.RAZORPAY_KEY_ID) {
    return res.status(500).json({ error: "Razorpay Key ID not configured in server environment." });
  }
  res.json({ key_id: process.env.RAZORPAY_KEY_ID });
});

/**
 * POST /api/create-order
 * Create an order on the Razorpay server
 */
app.post("/api/create-order", async (req, res) => {
  try {
    const { amount } = req.body; // expected in paise

    if (amount === undefined || amount === null) {
      return res.status(400).json({ error: "Amount is required." });
    }

    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount < 100) {
      return res.status(400).json({ error: "Amount must be an integer and at least 100 paise (Rs 1)." });
    }

    const options = {
      amount: parsedAmount,
      currency: "INR",
      receipt: `rcpt_${Date.now()}`
    };

    console.log(`Creating order options:`, options);
    
    // Create order using SDK
    const order = await razorpay.orders.create(options);
    
    console.log(`Order created successfully on Razorpay:`, order.id);
    
    // Return order details to frontend
    res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    console.error("Razorpay Order Creation Error:", error);
    res.status(500).json({
      error: "Failed to create Razorpay order.",
      details: error.message || error
    });
  }
});

/**
 * POST /api/verify-payment
 * Verify signature of successful payment
 */
app.post("/api/verify-payment", (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing required fields (order_id, payment_id, signature)." });
    }

    // Verify signature algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generated_signature = hmac.digest("hex");

    if (generated_signature === razorpay_signature) {
      console.log(`Payment verified successfully! Payment ID: ${razorpay_payment_id}`);
      res.status(200).json({ status: "success", message: "Payment verified successfully." });
    } else {
      console.warn(`Payment signature verification failed. Generated: ${generated_signature}, Provided: ${razorpay_signature}`);
      res.status(400).json({ status: "failure", message: "Signature mismatch. Unverified payment." });
    }
  } catch (error) {
    console.error("Payment Verification Error:", error);
    res.status(500).json({ error: "Verification failed.", details: error.message || error });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`Morya Hospital Server running at http://localhost:${PORT}`);
  console.log(`Serving static files from: ${__dirname}`);
  console.log(`==================================================`);
});
