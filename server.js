const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const paymentAmount = Number(process.env.APPOINTMENT_FEE || 250) * 100;
const disablePayments = process.env.DISABLE_PAYMENTS === 'true';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const appointmentsFile = path.join(__dirname, 'data', 'appointments.json');

function saveAppointment(appointment) {
  const appointments = JSON.parse(fs.readFileSync(appointmentsFile, 'utf8') || '[]');
  appointments.push(appointment);
  fs.writeFileSync(appointmentsFile, JSON.stringify(appointments, null, 2), 'utf8');
}

function createEmailContent(appointment) {
  return `Patient Name: ${appointment.name}\nEmail: ${appointment.email}\nPhone: ${appointment.phone}\nAge: ${appointment.age} / ${appointment.gender}\nPreferred Date: ${appointment.date}\nTime Slot: ${appointment.timeSlot}\nDoctor: ${appointment.doctor}\nMessage: ${appointment.message || 'N/A'}\nPayment ID: ${appointment.paymentId || 'N/A'}\nOrder ID: ${appointment.orderId || 'N/A'}\nAmount: Rs. ${appointment.amount / 100}`;
}

function createPatientEmailHtml(appointment) {
  return `
    <h2>Booking Confirmed - Sexology Clinic</h2>
    <p>Dear ${appointment.name},</p>
    <p>Your appointment has been booked successfully for <strong>${appointment.date}</strong> at <strong>${appointment.timeSlot}</strong>.</p>
    <p><strong>Doctor:</strong> ${appointment.doctor}</p>
    <p><strong>Receipt ID:</strong> ${appointment.paymentId || appointment.orderId}</p>
    <p><strong>Amount Paid:</strong> Rs. ${appointment.amount / 100}</p>
    <p>If you need assistance, contact us at <strong>${process.env.SMTP_USER}</strong>.</p>
    <p>Thank you for choosing Sexology Clinic.</p>
  `;
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/config', (req, res) => {
  res.json({
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    amount: paymentAmount,
    disablePayments,
    appointmentFee: Number(process.env.APPOINTMENT_FEE || 250),
  });
});

app.post('/api/create-order', async (req, res) => {
  const { name, phone, email, age, gender, date, timeSlot, doctor, message } = req.body;
  if (!name || !phone || !email || !age || !gender || !date || !timeSlot || !doctor) {
    return res.status(400).json({ error: 'Missing required booking fields.' });
  }

  try {
    const orderData = {
      amount: paymentAmount,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
      notes: {
        name,
        email,
        phone,
      },
    };

    const order = disablePayments
n      ? { id: `TEST_ORDER_${Date.now()}`, amount: paymentAmount, currency: 'INR', receipt: orderData.receipt }
      : await razorpay.orders.create(orderData);

    res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (error) {
    console.error('Order creation failed', error);
    res.status(500).json({ error: 'Unable to create order.' });
  }
});

app.post('/api/book-appointment', async (req, res) => {
  const { name, phone, email, age, gender, date, timeSlot, doctor, message, razorpayPaymentId, razorpayOrderId, razorpaySignature, amount } = req.body;
  if (!name || !phone || !email || !age || !gender || !date || !timeSlot || !doctor) {
    return res.status(400).json({ error: 'Missing required booking fields.' });
  }

  if (!disablePayments) {
    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return res.status(400).json({ error: 'Payment verification failed.' });
    }

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ error: 'Invalid Razorpay signature.' });
    }
  }

  const appointment = {
    id: `appointment_${Date.now()}`,
    name,
    phone,
    email,
    age,
    gender,
    date,
    timeSlot,
    doctor,
    message,
    paymentId: razorpayPaymentId || null,
    orderId: razorpayOrderId || null,
    amount: amount || paymentAmount,
    bookedAt: new Date().toISOString(),
  };

  try {
    saveAppointment(appointment);

    const adminMail = {
      from: process.env.SMTP_USER,
      to: process.env.NOTIFICATION_EMAIL,
      subject: `🚨 New Paid Appointment Booking - ${appointment.name}`,
      text: createEmailContent(appointment),
    };

    const patientMail = {
      from: process.env.SMTP_USER,
      to: appointment.email,
      subject: 'Booking Confirmed - Sexology Clinic',
      html: createPatientEmailHtml(appointment),
    };

    await transporter.sendMail(adminMail);
    await transporter.sendMail(patientMail);

    res.json({ success: true, appointment });
  } catch (error) {
    console.error('Booking failed', error);
    res.status(500).json({ error: 'Unable to save booking.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
