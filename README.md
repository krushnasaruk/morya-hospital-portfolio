# Urjaa Ayurveda Sexologist Clinic - Rebuild Plan

This document serves as the master blueprint for rebuilding the Urjaa Ayurveda Sexologist Clinic portfolio from scratch.

## 1. Project Overview & Branding
**Clinic Name:** Urjaa Ayurveda Sexologist Clinic
**Doctor:** Dr. Virendra Girase (est. 2008)
**Location:** Pune (Viman Nagar, Kharadi, Baner, Wakad, Hinjewadi)
**Color Scheme:** 
- Primary: Gold (`#D4AF37` and similar gradients)
- Background/Secondary: Dark Purple (`#2b0f4c`, `#150524`, `#0f524`)
**Aesthetic:** Premium, clean, modern. No over-the-top animations. Fast loading and highly readable.
**Core Features:** 
- Hero Section with Doctor Introduction
- Services (Ayurveda, Diet, Rejuvenation, etc.)
- Testimonials
- Fully functional Appointment Booking Form with Razorpay Integration

## 2. Layout Structure
1. **Header/Navigation:** Logo (Urjaa Ayurveda), Navigation Links, "Book Consultation" Call-to-Action button.
2. **Hero Section:** Dark purple background with gold text accents. A high-quality photo of Dr. Girase. Clear value proposition (e.g., "15+ Years of Confidential Ayurvedic Care").
3. **About Section:** Details about the clinic's history, confidentiality, and Dr. Girase's expertise.
4. **Services/Treatments:** Grid layout outlining sexual health treatments, dietary counseling, and herbal therapies.
5. **Certifications & Trust Badges:** Display of medical registrations and Ayurveda certifications to build trust.
6. **Testimonials:** Clean, readable patient reviews.
7. **Footer:** Contact details, clinic addresses (Viman Nagar, Baner, etc.), and social links.
8. **Floating Actions:** A sticky "Book Appointment" button or WhatsApp chat widget.

## 3. Booking Form & Razorpay Integration
The core interactive feature is the Appointment Booking Modal.

**Form Fields Required:**
- Full Name
- Phone Number (10 digits)
- Email Address
- Age
- Gender (Male, Female, Other)
- Preferred Date
- Preferred Time Slot (Morning / Evening)
- Consulting Doctor (Dr. Virendra Girase)
- Message / Symptoms (Optional)

**Razorpay Flow:**
1. User fills the form and clicks "Pay Rs. 250 & Confirm Booking".
2. Frontend calls `/api/create-order` to generate a Razorpay Order ID.
3. Frontend initializes Razorpay Checkout SDK with the generated Order ID, Amount (25000 paise), and Key ID.
4. On successful payment, Razorpay returns `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature`.
5. Frontend sends these details along with the form data to `/api/book-appointment`.
6. Backend verifies the HMAC SHA256 signature using the `RAZORPAY_KEY_SECRET`.
7. If valid, the backend sends confirmation emails and saves the record.

**Razorpay Secrets (Stored in `.env`):**
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

## 4. Backend & Email Format (`server.js`)
The backend uses Express.js and Nodemailer to handle order creation, payment verification, and email notifications.

**Email Credentials (Stored in `.env`):**
- `SMTP_USER` (e.g., Hospital Email for sending)
- `SMTP_PASS` (App Password)
- `NOTIFICATION_EMAIL` (Email to receive admin alerts)

**Hospital Notification Email Format:**
- **Subject:** `🚨 New Paid Appointment Booking - [Patient Name]`
- **Body Layout:** 
  - Patient Name, Email, Phone, Age/Gender.
  - Reason, Doctor Name, Appointment Date, Time Slot.
  - Razorpay Payment ID & Amount Paid (Rs. 250).
  - Patient's Symptoms / Medical Message.

**Patient Confirmation Email Format:**
- **Subject:** `Booking Confirmed - Urjaa Ayurveda`
- **Body Layout:**
  - Confirmation that the appointment slot is booked and payment of Rs. 250 was received.
  - Summary of Doctor, Date, Shift Slot, Receipt ID, and Status (Paid / Confirmed).
  - Clinic contact details for urgent help.

## 5. Development Steps for Rebuild
1. **Initialize Project:** `npm init -y` and install `express`, `cors`, `dotenv`, `razorpay`, `nodemailer`.
2. **Setup Server (`server.js`):** Implement the endpoints for `/api/config`, `/api/create-order`, `/api/verify-payment`, and `/api/book-appointment` using the logic outlined above.
3. **Build UI (`index.html` & `index.css`):** Code the layout using the Dark Purple and Gold color scheme.
4. **Connect Frontend (`index.js`):** Implement the Razorpay Checkout flow and form validation.
5. **Testing:** Test the booking flow using Razorpay test credentials.