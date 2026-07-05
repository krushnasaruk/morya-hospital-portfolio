require("dotenv").config();
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Flat-file Database Configuration
const DB_FILE = path.join(__dirname, "data_records.json");

const initializeDb = () => {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ appointments: [], enquiries: [] }, null, 2));
  }
};

const getDbRecords = () => {
  initializeDb();
  try {
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data);
  } catch (e) {
    console.error("Error reading db file:", e);
    return { appointments: [], enquiries: [] };
  }
};

const saveRecord = (type, record) => {
  initializeDb();
  try {
    const records = getDbRecords();
    record.timestamp = new Date().toISOString();
    if (type === "appointment") {
      records.appointments.push(record);
    } else {
      records.enquiries.push(record);
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(records, null, 2));
    console.log(`Saved new ${type} record to local database.`);
    return true;
  } catch (e) {
    console.error(`Error saving ${type} record to db:`, e);
    return false;
  }
};

// Admin Session Token Configuration
const ADMIN_TOKEN = "MoryaHospitalAdminSecureTokenSession2026";

const verifyAdminToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader === `Bearer ${ADMIN_TOKEN}`) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized: Invalid or missing token." });
};

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

// Route mapping for clean Admin URL
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

/**
 * GET /api/config
 * Safely expose the public Razorpay Key ID to the frontend
 */
app.get("/api/config", (req, res) => {
  const disablePayments = process.env.DISABLE_PAYMENTS === "true";
  if (!disablePayments && !process.env.RAZORPAY_KEY_ID) {
    return res.status(500).json({ error: "Razorpay Key ID not configured in server environment." });
  }
  res.json({ 
    key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_mock",
    disable_payments: disablePayments
  });
});

/**
 * POST /api/create-order
 * Create an order on the Razorpay server
 */
app.post("/api/create-order", async (req, res) => {
  try {
    const { amount } = req.body; // expected in paise

    // Use APPOINTMENT_FEE from .env (e.g. 250), defaulting to 250 if not specified
    const defaultAmount = (parseInt(process.env.APPOINTMENT_FEE, 10) || 250) * 100;
    const amountVal = amount !== undefined && amount !== null ? amount : defaultAmount;

    const parsedAmount = parseInt(amountVal, 10);
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

// Setup Nodemailer Transporter
const createTransporter = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("⚠️ SMTP_USER and SMTP_PASS are not configured in your .env file. Email notifications are disabled.");
    return null;
  }
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT, 10) || 465,
    secure: parseInt(process.env.SMTP_PORT, 10) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Send email notifications (to hospital and confirmation to patient)
const sendNotificationEmails = async (patientDetails, paymentId = null) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn("Transporter not initialized. Skipping email sending.");
    return false;
  }

  const { name, phone, email, age, gender, date, slot, doctor, reason, message } = patientDetails;
  const isAppointment = !!paymentId;
  const siteName = "Morya Multispeciality Hospital";
  const hospitalEmail = process.env.NOTIFICATION_EMAIL || "sutraverse11@gmail.com";

  const getDoctorName = (docId) => {
    switch (docId) {
      case "rashmi": return "Dr. Rashmi Patil (Obstetric & Gynaecology)";
      case "vaibhav": return "Dr. Vaibhav Patil (General Surgeon)";
      case "general": return "General Medicine OPD Physician";
      default: return docId || "Any Doctor";
    }
  };

  const getSlotName = (slotId) => {
    switch (slotId) {
      case "morning": return "Morning OPD (10:00 AM - 1:00 PM)";
      case "evening": return "Evening OPD (5:00 PM - 8:00 PM)";
      default: return slotId || "General Hours";
    }
  };

  // Email template for the Hospital
  const hospitalMailOptions = {
    from: `"${siteName} Alerts" <${process.env.SMTP_USER}>`,
    to: hospitalEmail,
    subject: isAppointment 
      ? `🚨 New Paid Appointment Booking - ${name}` 
      : `✉️ New General Inquiry - ${name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <div style="background-color: #0f70b7; padding: 20px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 24px; letter-spacing: 0.5px;">${isAppointment ? 'New Appointment Booking' : 'New General Enquiry'}</h2>
        </div>
        <div style="padding: 24px; color: #333333; line-height: 1.6;">
          <p style="font-size: 16px; margin-top: 0;">You have received a new ${isAppointment ? 'appointment booking with confirmed payment' : 'inquiry'} from your website:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 10px 0; font-weight: bold; width: 150px; color: #555555;">Patient Name:</td>
              <td style="padding: 10px 0; color: #111111;">${name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 10px 0; font-weight: bold; color: #555555;">Email:</td>
              <td style="padding: 10px 0; color: #111111;"><a href="mailto:${email}" style="color: #0f70b7; text-decoration: none;">${email}</a></td>
            </tr>
            ${phone ? `
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 10px 0; font-weight: bold; color: #555555;">Phone:</td>
              <td style="padding: 10px 0; color: #111111;"><a href="tel:${phone}" style="color: #0f70b7; text-decoration: none;">${phone}</a></td>
            </tr>
            ` : ''}
            ${age ? `
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 10px 0; font-weight: bold; color: #555555;">Age / Gender:</td>
              <td style="padding: 10px 0; text-transform: capitalize; color: #111111;">${age} Years / ${gender}</td>
            </tr>
            ` : ''}
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 10px 0; font-weight: bold; color: #555555;">Reason:</td>
              <td style="padding: 10px 0; text-transform: capitalize; color: #111111;">${reason.replace("-", " ")}</td>
            </tr>
            ${isAppointment ? `
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 10px 0; font-weight: bold; color: #555555;">Doctor:</td>
              <td style="padding: 10px 0; font-weight: bold; color: #0f70b7;">${getDoctorName(doctor)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 10px 0; font-weight: bold; color: #555555;">Appt Date:</td>
              <td style="padding: 10px 0; color: #111111;">${date}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 10px 0; font-weight: bold; color: #555555;">Time Slot:</td>
              <td style="padding: 10px 0; color: #111111;">${getSlotName(slot)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 10px 0; font-weight: bold; color: #555555;">Payment ID:</td>
              <td style="padding: 10px 0; font-family: monospace; font-size: 14px; color: #2e7d32; font-weight: bold;">${paymentId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 10px 0; font-weight: bold; color: #555555;">Amount Paid:</td>
              <td style="padding: 10px 0; color: #111111;">Rs. ${process.env.APPOINTMENT_FEE || 250}.00 (via Razorpay)</td>
            </tr>
            ` : ''}
          </table>

          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; border-left: 4px solid #0f70b7; margin-top: 20px;">
            <strong style="display: block; margin-bottom: 5px; color: #555555;">Patient's Symptoms / Medical Message:</strong>
            <p style="margin: 0; font-style: italic; color: #444444;">"${message}"</p>
          </div>
        </div>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; color: #777777; border-top: 1px solid #e0e0e0;">
          This is an automated notification from Morya Hospital Site.
        </div>
      </div>
    `
  };

  // Email template for the Patient
  const patientMailOptions = {
    from: `"${siteName}" <${process.env.SMTP_USER}>`,
    to: email,
    subject: isAppointment 
      ? `Booking Confirmed - Morya Multispeciality Hospital` 
      : `Enquiry Received - Morya Multispeciality Hospital`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <div style="background-color: #0f70b7; padding: 20px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 24px; letter-spacing: 0.5px;">Morya Hospital</h2>
          <span style="font-size: 13px; opacity: 0.9;">Wadgaon Budruk, Pune</span>
        </div>
        <div style="padding: 24px; color: #333333; line-height: 1.6;">
          <p style="font-size: 16px; margin-top: 0;">Dear <strong>${name}</strong>,</p>
          
          ${isAppointment ? `
          <p>We are pleased to inform you that your appointment booking is <strong>confirmed</strong> and your payment of <strong>Rs. ${process.env.APPOINTMENT_FEE || 250}.00</strong> was received successfully.</p>
          <p>Our desk team will review your details and reach out to you within 2 hours to confirm your scheduled slot.</p>
          
          <div style="background-color: #e8f5e9; padding: 15px; border-radius: 6px; border-left: 4px solid #2e7d32; margin: 20px 0;">
            <strong style="color: #2e7d32; display: block; margin-bottom: 5px;">Appointment & Payment Details:</strong>
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <tr><td style="font-weight: bold; width: 120px; padding: 4px 0;">Doctor:</td><td>${getDoctorName(doctor)}</td></tr>
              <tr><td style="font-weight: bold; padding: 4px 0;">Appt Date:</td><td>${date}</td></tr>
              <tr><td style="font-weight: bold; padding: 4px 0;">Shift Slot:</td><td>${getSlotName(slot)}</td></tr>
              <tr><td style="font-weight: bold; padding: 4px 0;">Receipt ID:</td><td>${paymentId}</td></tr>
              <tr><td style="font-weight: bold; padding: 4px 0;">Amount:</td><td>Rs. ${process.env.APPOINTMENT_FEE || 250}.00</td></tr>
              <tr><td style="font-weight: bold; padding: 4px 0;">Status:</td><td style="color: green; font-weight: bold;">Paid / Confirmed</td></tr>
            </table>
          </div>
          ` : `
          <p>Thank you for reaching out to us. We have received your inquiry regarding <strong>${reason.replace("-", " ")}</strong>.</p>
          <p>Our executive/doctor will review your message and reply or call you within 2-4 business hours.</p>
          `}
          
          <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 25px 0;" />
          
          <p style="margin-bottom: 5px; font-weight: bold;">Need urgent help?</p>
          <p style="margin: 0;">Call us 24x7 at: <strong style="color: #0f70b7;">+91-7720941777</strong></p>
          <p style="margin: 0;">Or reply directly to this email.</p>
        </div>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; color: #777777; border-top: 1px solid #e0e0e0;">
          &copy; 2026 Morya Multispeciality Hospital. All rights reserved.
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(hospitalMailOptions);
    await transporter.sendMail(patientMailOptions);
    console.log("Emails sent successfully to hospital and patient!");
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

/**
 * POST /api/book-appointment
 * Verify signature of successful payment and send emails
 */
app.post("/api/book-appointment", async (req, res) => {
  try {
    const { 
      name, 
      phone,
      email, 
      age,
      gender,
      date,
      slot,
      doctor,
      reason, 
      message, 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = req.body;

    const disablePayments = process.env.DISABLE_PAYMENTS === "true";
    const payId = razorpay_payment_id || "MOCK_PAY_" + Date.now();
    const orderId = razorpay_order_id || "MOCK_ORDER_" + Date.now();

    if (!disablePayments) {
      if (!name || !email || !reason || !message || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: "Missing required booking or payment fields." });
      }

      // Verify payment signature
      const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
      hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
      const generated_signature = hmac.digest("hex");

      if (generated_signature !== razorpay_signature) {
        console.warn(`Payment signature verification failed. Generated: ${generated_signature}, Provided: ${razorpay_signature}`);
        return res.status(400).json({ error: "Signature mismatch. Unverified payment." });
      }

      console.log(`Payment verified successfully for ${name}. Payment ID: ${payId}`);
    } else {
      console.log(`Payment bypassed (DISABLE_PAYMENTS=true) for patient: ${name}. Generated Payment ID: ${payId}`);
    }

    // Send emails (Include all destructured patient details)
    const emailSent = await sendNotificationEmails({ name, phone, email, age, gender, date, slot, doctor, reason, message }, payId);

    // Save to local flat-file database
    saveRecord("appointment", {
      id: payId,
      name,
      phone,
      email,
      age,
      gender,
      date,
      slot,
      doctor,
      reason,
      message,
      razorpay_payment_id: payId,
      razorpay_order_id: orderId
    });

    res.status(200).json({ 
      status: "success", 
      message: "Appointment booked, payment verified, and emails sent.", 
      emailSent 
    });
  } catch (error) {
    console.error("Booking Error:", error);
    res.status(500).json({ error: "Booking failed.", details: error.message });
  }
});

/**
 * POST /api/submit-enquiry
 * Send email notifications for non-paid general enquiries
 */
app.post("/api/submit-enquiry", async (req, res) => {
  try {
    const { name, email, reason, message } = req.body;

    if (!name || !email || !reason || !message) {
      return res.status(400).json({ error: "Missing required enquiry fields." });
    }

    console.log(`Enquiry received from ${name} for ${reason}`);

    // Send emails
    const emailSent = await sendNotificationEmails({ name, email, reason, message });

    // Save to local flat-file database
    saveRecord("enquiry", {
      name,
      email,
      reason,
      message
    });

    res.status(200).json({ 
      status: "success", 
      message: "Enquiry submitted and emails sent.", 
      emailSent 
    });
  } catch (error) {
    console.error("Enquiry Error:", error);
    res.status(500).json({ error: "Enquiry submission failed.", details: error.message });
  }
});

/**
 * POST /api/admin/login
 * Verify admin credentials and issue temporary session token
 */
app.post("/api/admin/login", (req, res) => {
  try {
    const { username, password } = req.body;
    const expectedUser = process.env.ADMIN_USER || "admin";
    const expectedPass = process.env.ADMIN_PASS || "morya@admin123";

    if (username === expectedUser && password === expectedPass) {
      res.status(200).json({ status: "success", token: ADMIN_TOKEN });
    } else {
      res.status(401).json({ error: "Invalid username or password." });
    }
  } catch (error) {
    res.status(500).json({ error: "Login process failed." });
  }
});

/**
 * GET /api/admin/appointments
 * Fetch list of all confirmed appointments (requires authorization token)
 */
app.get("/api/admin/appointments", verifyAdminToken, (req, res) => {
  try {
    const records = getDbRecords();
    res.status(200).json({ appointments: records.appointments });
  } catch (error) {
    res.status(500).json({ error: "Failed to load appointments." });
  }
});

/**
 * GET /api/admin/enquiries
 * Fetch list of all enquiries (requires authorization token)
 */
app.get("/api/admin/enquiries", verifyAdminToken, (req, res) => {
  try {
    const records = getDbRecords();
    res.status(200).json({ enquiries: records.enquiries });
  } catch (error) {
    res.status(500).json({ error: "Failed to load enquiries." });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`Morya Hospital Server running at http://localhost:${PORT}`);
  console.log(`Serving static files from: ${__dirname}`);
  console.log(`==================================================`);
});
