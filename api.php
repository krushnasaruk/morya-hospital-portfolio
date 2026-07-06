<?php
/**
 * Morya Multispeciality Hospital Backend API (PHP Port)
 * Replaces server.js, providing full compatibility with the existing frontend
 */

// Enable Error Reporting for debugging (can be disabled in production)
ini_set('display_errors', 1);
error_reporting(E_ALL);

// CORS Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json");

// Handle OPTIONS Preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// 1. Environment Variable Parser Helper
function loadEnv($path) {
    if (!file_exists($path)) {
        return;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $name = trim($parts[0]);
            $value = trim($parts[1]);
            // Remove optional surrounding quotes
            $value = trim($value, '"\'');
            if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
                putenv(sprintf('%s=%s', $name, $value));
                $_ENV[$name] = $value;
                $_SERVER[$name] = $value;
            }
        }
    }
}

// Load Environment Variables
loadEnv(__DIR__ . '/.env');

// Helper to get environment variable with fallback
function env($key, $default = null) {
    $value = getenv($key);
    if ($value === false) {
        $value = $_ENV[$key] ?? $_SERVER[$key] ?? $default;
    }
    return $value;
}

// 2. Flat-file Database Configuration
$db_file = __DIR__ . '/data_records.json';

function initializeDb($db_file) {
    if (!file_exists($db_file)) {
        file_put_contents($db_file, json_encode(['appointments' => [], 'enquiries' => []], JSON_PRETTY_PRINT));
    }
}

function getDbRecords($db_file) {
    initializeDb($db_file);
    try {
        $data = file_get_contents($db_file);
        $decoded = json_decode($data, true);
        return is_array($decoded) ? $decoded : ['appointments' => [], 'enquiries' => []];
    } catch (Exception $e) {
        return ['appointments' => [], 'enquiries' => []];
    }
}

function saveRecord($db_file, $type, $record) {
    initializeDb($db_file);
    try {
        $records = getDbRecords($db_file);
        $record['timestamp'] = date(DATE_ATOM);
        if ($type === 'appointment') {
            $records['appointments'][] = $record;
        } else {
            $records['enquiries'][] = $record;
        }
        file_put_contents($db_file, json_encode($records, JSON_PRETTY_PRINT));
        return true;
    } catch (Exception $e) {
        return false;
    }
}

// 3. Admin Authentication Configuration
$ADMIN_TOKEN = "MoryaHospitalAdminSecureTokenSession2026";

// Polyfill getallheaders() if not available (e.g. Nginx, PHP-FPM, etc.)
if (!function_exists('getallheaders')) {
    function getallheaders() {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            }
        }
        return $headers;
    }
}

function verifyAdminToken($ADMIN_TOKEN) {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? $headers['AUTHORIZATION'] ?? '';
    if ($authHeader === "Bearer $ADMIN_TOKEN") {
        return true;
    }
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized: Invalid or missing token.']);
    exit;
}

// Get action parameter from rewrite routing
$action = trim($_GET['action'] ?? '', '/');

// Parse JSON input body if present
$input = json_decode(file_get_contents('php://input'), true) ?? [];

// Helper functions for doctor and slot names matching server.js
function getDoctorName($docId) {
    switch ($docId) {
        case "rashmi": return "Dr. Rashmi Patil (Obstetric & Gynaecology)";
        case "vaibhav": return "Dr. Vaibhav Patil (General Surgeon)";
        case "general": return "General Medicine OPD Physician";
        default: return $docId ?: "Any Doctor";
    }
}

function getSlotName($slotId) {
    switch ($slotId) {
        case "morning": return "Morning OPD (10:00 AM - 1:00 PM)";
        case "evening": return "Evening OPD (5:00 PM - 8:00 PM)";
        default: return $slotId ?: "General Hours";
    }
}

// 4. PHPMailer Integration for Notifications
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require __DIR__ . '/phpmailer/Exception.php';
require __DIR__ . '/phpmailer/PHPMailer.php';
require __DIR__ . '/phpmailer/SMTP.php';

function sendNotificationEmails($patientDetails, $paymentId = null) {
    $smtp_user = env('SMTP_USER');
    $smtp_pass = env('SMTP_PASS');
    
    if (!$smtp_user || !$smtp_pass) {
        error_log("⚠️ SMTP credentials not configured. Skipping email sending.");
        return false;
    }
    
    $smtp_host = env('SMTP_HOST', 'smtp.gmail.com');
    $smtp_port = intval(env('SMTP_PORT', 465));
    $notification_email = env('NOTIFICATION_EMAIL', 'sutraverse11@gmail.com');
    
    $name = $patientDetails['name'] ?? '';
    $phone = $patientDetails['phone'] ?? '';
    $email = $patientDetails['email'] ?? '';
    $age = $patientDetails['age'] ?? '';
    $gender = $patientDetails['gender'] ?? '';
    $date = $patientDetails['date'] ?? '';
    $slot = $patientDetails['slot'] ?? '';
    $doctor = $patientDetails['doctor'] ?? '';
    $reason = $patientDetails['reason'] ?? '';
    $message = $patientDetails['message'] ?? '';
    
    $isAppointment = !empty($paymentId);
    $siteName = "Morya Multispeciality Hospital";
    
    // --- 1. Email for the Hospital ---
    $hospitalMail = new PHPMailer(true);
    try {
        $hospitalMail->isSMTP();
        $hospitalMail->Host       = $smtp_host;
        $hospitalMail->SMTPAuth   = true;
        $hospitalMail->Username   = $smtp_user;
        $hospitalMail->Password   = $smtp_pass;
        $hospitalMail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS; // Explicitly SSL for port 465
        $hospitalMail->Port       = $smtp_port;
        
        $hospitalMail->setFrom($smtp_user, "$siteName Alerts");
        $hospitalMail->addAddress($notification_email);
        
        $hospitalMail->isHTML(true);
        $hospitalMail->Subject = $isAppointment 
            ? "🚨 New Paid Appointment Booking - $name" 
            : "✉️ New General Inquiry - $name";
            
        $docNameFormatted = getDoctorName($doctor);
        $slotNameFormatted = getSlotName($slot);
        $reasonFormatted = str_replace("-", " ", $reason);
        $apptFee = env('APPOINTMENT_FEE', 250);
        
        $hospitalHtml = '
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <div style="background-color: #0f70b7; padding: 20px; text-align: center; color: white;">
                <h2 style="margin: 0; font-size: 24px; letter-spacing: 0.5px;">' . ($isAppointment ? 'New Appointment Booking' : 'New General Enquiry') . '</h2>
            </div>
            <div style="padding: 24px; color: #333333; line-height: 1.6;">
                <p style="font-size: 16px; margin-top: 0;">You have received a new ' . ($isAppointment ? 'appointment booking with confirmed payment' : 'inquiry') . ' from your website:</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr style="border-bottom: 1px solid #f0f0f0;">
                        <td style="padding: 10px 0; font-weight: bold; width: 150px; color: #555555;">Patient Name:</td>
                        <td style="padding: 10px 0; color: #111111;">' . htmlspecialchars($name) . '</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f0f0f0;">
                        <td style="padding: 10px 0; font-weight: bold; color: #555555;">Email:</td>
                        <td style="padding: 10px 0; color: #111111;"><a href="mailto:' . htmlspecialchars($email) . '" style="color: #0f70b7; text-decoration: none;">' . htmlspecialchars($email) . '</a></td>
                    </tr>';
        if ($phone) {
            $hospitalHtml .= '
                    <tr style="border-bottom: 1px solid #f0f0f0;">
                        <td style="padding: 10px 0; font-weight: bold; color: #555555;">Phone:</td>
                        <td style="padding: 10px 0; color: #111111;"><a href="tel:' . htmlspecialchars($phone) . '" style="color: #0f70b7; text-decoration: none;">' . htmlspecialchars($phone) . '</a></td>
                    </tr>';
        }
        if ($age) {
            $hospitalHtml .= '
                    <tr style="border-bottom: 1px solid #f0f0f0;">
                        <td style="padding: 10px 0; font-weight: bold; color: #555555;">Age / Gender:</td>
                        <td style="padding: 10px 0; text-transform: capitalize; color: #111111;">' . htmlspecialchars($age) . ' Years / ' . htmlspecialchars($gender) . '</td>
                    </tr>';
        }
        $hospitalHtml .= '
                    <tr style="border-bottom: 1px solid #f0f0f0;">
                        <td style="padding: 10px 0; font-weight: bold; color: #555555;">Reason:</td>
                        <td style="padding: 10px 0; text-transform: capitalize; color: #111111;">' . htmlspecialchars($reasonFormatted) . '</td>
                    </tr>';
        if ($isAppointment) {
            $hospitalHtml .= '
                    <tr style="border-bottom: 1px solid #f0f0f0;">
                        <td style="padding: 10px 0; font-weight: bold; color: #555555;">Doctor:</td>
                        <td style="padding: 10px 0; font-weight: bold; color: #0f70b7;">' . htmlspecialchars($docNameFormatted) . '</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f0f0f0;">
                        <td style="padding: 10px 0; font-weight: bold; color: #555555;">Appt Date:</td>
                        <td style="padding: 10px 0; color: #111111;">' . htmlspecialchars($date) . '</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f0f0f0;">
                        <td style="padding: 10px 0; font-weight: bold; color: #555555;">Time Slot:</td>
                        <td style="padding: 10px 0; color: #111111;">' . htmlspecialchars($slotNameFormatted) . '</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f0f0f0;">
                        <td style="padding: 10px 0; font-weight: bold; color: #555555;">Payment ID:</td>
                        <td style="padding: 10px 0; font-family: monospace; font-size: 14px; color: #2e7d32; font-weight: bold;">' . htmlspecialchars($paymentId) . '</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f0f0f0;">
                        <td style="padding: 10px 0; font-weight: bold; color: #555555;">Amount Paid:</td>
                        <td style="padding: 10px 0; color: #111111;">Rs. ' . htmlspecialchars($apptFee) . '.00 (via Razorpay)</td>
                    </tr>';
        }
        $hospitalHtml .= '
                </table>
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; border-left: 4px solid #0f70b7; margin-top: 20px;">
                    <strong style="display: block; margin-bottom: 5px; color: #555555;">Patient\'s Symptoms / Medical Message:</strong>
                    <p style="margin: 0; font-style: italic; color: #444444;">"' . htmlspecialchars($message) . '"</p>
                </div>
            </div>
            <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; color: #777777; border-top: 1px solid #e0e0e0;">
                This is an automated notification from Morya Hospital Site.
            </div>
        </div>';
        
        $hospitalMail->Body = $hospitalHtml;
        $hospitalMail->send();
        
    } catch (Exception $e) {
        error_log("PHPMailer error sending to hospital: " . $hospitalMail->ErrorInfo);
        return false;
    }
    
    // --- 2. Email for the Patient ---
    $patientMail = new PHPMailer(true);
    try {
        $patientMail->isSMTP();
        $patientMail->Host       = $smtp_host;
        $patientMail->SMTPAuth   = true;
        $patientMail->Username   = $smtp_user;
        $patientMail->Password   = $smtp_pass;
        $patientMail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        $patientMail->Port       = $smtp_port;
        
        $patientMail->setFrom($smtp_user, $siteName);
        $patientMail->addAddress($email);
        
        $patientMail->isHTML(true);
        $patientMail->Subject = $isAppointment 
            ? "Booking Confirmed - Morya Multispeciality Hospital" 
            : "Enquiry Received - Morya Multispeciality Hospital";
            
        $docNameFormatted = getDoctorName($doctor);
        $slotNameFormatted = getSlotName($slot);
        $reasonFormatted = str_replace("-", " ", $reason);
        $apptFee = env('APPOINTMENT_FEE', 250);
        
        $patientHtml = '
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <div style="background-color: #0f70b7; padding: 20px; text-align: center; color: white;">
                <h2 style="margin: 0; font-size: 24px; letter-spacing: 0.5px;">' . $siteName . '</h2>
                <span style="font-size: 13px; opacity: 0.9;">Wadgaon Budruk, Pune</span>
            </div>
            <div style="padding: 24px; color: #333333; line-height: 1.6;">
                <p style="font-size: 16px; margin-top: 0;">Dear <strong>' . htmlspecialchars($name) . '</strong>,</p>';
        if ($isAppointment) {
            $patientHtml .= '
                <p>We are pleased to inform you that your appointment booking is <strong>confirmed</strong> and your payment of <strong>Rs. ' . htmlspecialchars($apptFee) . '.00</strong> was received successfully.</p>
                <p>Our desk team will review your details and reach out to you within 2 hours to confirm your scheduled slot.</p>
                
                <div style="background-color: #e8f5e9; padding: 15px; border-radius: 6px; border-left: 4px solid #2e7d32; margin: 20px 0;">
                    <strong style="color: #2e7d32; display: block; margin-bottom: 5px;">Appointment & Payment Details:</strong>
                    <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                        <tr><td style="font-weight: bold; width: 120px; padding: 4px 0;">Doctor:</td><td>' . htmlspecialchars($docNameFormatted) . '</td></tr>
                        <tr><td style="font-weight: bold; padding: 4px 0;">Appt Date:</td><td>' . htmlspecialchars($date) . '</td></tr>
                        <tr><td style="font-weight: bold; padding: 4px 0;">Shift Slot:</td><td>' . htmlspecialchars($slotNameFormatted) . '</td></tr>
                        <tr><td style="font-weight: bold; padding: 4px 0;">Receipt ID:</td><td>' . htmlspecialchars($paymentId) . '</td></tr>
                        <tr><td style="font-weight: bold; padding: 4px 0;">Amount:</td><td>Rs. ' . htmlspecialchars($apptFee) . '.00</td></tr>
                        <tr><td style="font-weight: bold; padding: 4px 0;">Status:</td><td style="color: green; font-weight: bold;">Paid / Confirmed</td></tr>
                    </table>
                </div>';
        } else {
            $patientHtml .= '
                <p>Thank you for reaching out to us. We have received your inquiry regarding <strong>' . htmlspecialchars($reasonFormatted) . '</strong>.</p>
                <p>Our executive/doctor will review your message and reply or call you within 2-4 business hours.</p>';
        }
        $patientHtml .= '
                <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 25px 0;" />
                <p style="margin-bottom: 5px; font-weight: bold;">Need urgent help?</p>
                <p style="margin: 0;">Call us 24x7 at: <strong style="color: #0f70b7;">+91-7720941777</strong></p>
                <p style="margin: 0;">Or reply directly to this email.</p>
            </div>
            <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; color: #777777; border-top: 1px solid #e0e0e0;">
                &copy; 2026 Morya Multispeciality Hospital. All rights reserved.
            </div>
        </div>';
        
        $patientMail->Body = $patientHtml;
        $patientMail->send();
        return true;
        
    } catch (Exception $e) {
        error_log("PHPMailer error sending to patient: " . $patientMail->ErrorInfo);
        return false;
    }
}

// 5. Router endpoints matching action parameter
switch ($action) {
    
    case 'config':
        $disablePayments = env('DISABLE_PAYMENTS') === 'true';
        $keyId = env('RAZORPAY_KEY_ID', 'rzp_test_mock');
        
        echo json_encode([
            'key_id' => $keyId,
            'disable_payments' => $disablePayments
        ]);
        break;
        
    case 'create-order':
        try {
            $amount = $input['amount'] ?? null;
            $defaultAmount = (intval(env('APPOINTMENT_FEE', 250))) * 100;
            $amountVal = ($amount !== null && $amount !== '') ? intval($amount) : $defaultAmount;
            
            if ($amountVal < 100) {
                http_response_code(400);
                echo json_encode(['error' => 'Amount must be an integer and at least 100 paise (Rs 1).']);
                break;
            }
            
            $keyId = env('RAZORPAY_KEY_ID');
            $keySecret = env('RAZORPAY_KEY_SECRET');
            
            if (!$keyId || !$keySecret) {
                http_response_code(500);
                echo json_encode(['error' => 'Razorpay credentials not configured in server environment.']);
                break;
            }
            
            $options = [
                'amount' => $amountVal,
                'currency' => 'INR',
                'receipt' => 'rcpt_' . time()
            ];
            
            // Call Razorpay API using cURL
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, 'https://api.razorpay.com/v1/orders');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($options));
            curl_setopt($ch, CURLOPT_USERPWD, "$keyId:$keySecret");
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            
            $result = curl_exec($ch);
            $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($httpcode !== 200) {
                http_response_code(500);
                echo json_encode([
                    'error' => 'Failed to create Razorpay order.',
                    'details' => $result
                ]);
            } else {
                $order = json_decode($result, true);
                echo json_encode([
                    'order_id' => $order['id'],
                    'amount' => $order['amount'],
                    'currency' => $order['currency']
                ]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to create order', 'details' => $e->getMessage()]);
        }
        break;
        
    case 'verify-payment':
        try {
            $order_id = $input['razorpay_order_id'] ?? '';
            $payment_id = $input['razorpay_payment_id'] ?? '';
            $signature = $input['razorpay_signature'] ?? '';
            
            if (empty($order_id) || empty($payment_id) || empty($signature)) {
                http_response_code(400);
                echo json_encode(['error' => 'Missing required fields (order_id, payment_id, signature).']);
                break;
            }
            
            $keySecret = env('RAZORPAY_KEY_SECRET');
            $expectedSignature = hash_hmac('sha256', $order_id . '|' . $payment_id, $keySecret);
            
            if ($expectedSignature === $signature) {
                echo json_encode(['status' => 'success', 'message' => 'Payment verified successfully.']);
            } else {
                http_response_code(400);
                echo json_encode(['status' => 'failure', 'message' => 'Signature mismatch. Unverified payment.']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Verification failed', 'details' => $e->getMessage()]);
        }
        break;
        
    case 'book-appointment':
        try {
            $name = $input['name'] ?? '';
            $phone = $input['phone'] ?? '';
            $email = $input['email'] ?? '';
            $age = $input['age'] ?? '';
            $gender = $input['gender'] ?? '';
            $date = $input['date'] ?? '';
            $slot = $input['slot'] ?? '';
            $doctor = $input['doctor'] ?? '';
            $message = $input['message'] ?? '';
            $reason = $input['reason'] ?? '';
            
            $order_id = $input['razorpay_order_id'] ?? '';
            $payment_id = $input['razorpay_payment_id'] ?? '';
            $signature = $input['razorpay_signature'] ?? '';
            
            $disablePayments = env('DISABLE_PAYMENTS') === 'true';
            $payId = !empty($payment_id) ? $payment_id : "MOCK_PAY_" . time();
            $orderId = !empty($order_id) ? $order_id : "MOCK_ORDER_" . time();
            
            if (!$disablePayments) {
                if (empty($name) || empty($email) || empty($reason) || empty($message) || empty($order_id) || empty($payment_id) || empty($signature)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Missing required booking or payment fields.']);
                    break;
                }
                
                // Verify payment signature
                $keySecret = env('RAZORPAY_KEY_SECRET');
                $expectedSignature = hash_hmac('sha256', $order_id . '|' . $payment_id, $keySecret);
                
                if ($expectedSignature !== $signature) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Signature mismatch. Unverified payment.']);
                    break;
                }
            }
            
            // Send Emails
            $emailSent = sendNotificationEmails([
                'name' => $name,
                'phone' => $phone,
                'email' => $email,
                'age' => $age,
                'gender' => $gender,
                'date' => $date,
                'slot' => $slot,
                'doctor' => $doctor,
                'reason' => $reason,
                'message' => $message
            ], $payId);
            
            // Save to database
            saveRecord($db_file, 'appointment', [
                'id' => $payId,
                'name' => $name,
                'phone' => $phone,
                'email' => $email,
                'age' => $age,
                'gender' => $gender,
                'date' => $date,
                'slot' => $slot,
                'doctor' => $doctor,
                'reason' => $reason,
                'message' => $message,
                'razorpay_payment_id' => $payId,
                'razorpay_order_id' => $orderId
            ]);
            
            echo json_encode([
                'status' => 'success',
                'message' => 'Appointment booked, payment verified, and emails sent.',
                'emailSent' => $emailSent
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Booking failed', 'details' => $e->getMessage()]);
        }
        break;
        
    case 'submit-enquiry':
        try {
            $name = $input['name'] ?? '';
            $email = $input['email'] ?? '';
            $reason = $input['reason'] ?? '';
            $message = $input['message'] ?? '';
            
            if (empty($name) || empty($email) || empty($reason) || empty($message)) {
                http_response_code(400);
                echo json_encode(['error' => 'Missing required enquiry fields.']);
                break;
            }
            
            // Send Emails
            $emailSent = sendNotificationEmails([
                'name' => $name,
                'email' => $email,
                'reason' => $reason,
                'message' => $message
            ]);
            
            // Save to database
            saveRecord($db_file, 'enquiry', [
                'name' => $name,
                'email' => $email,
                'reason' => $reason,
                'message' => $message
            ]);
            
            echo json_encode([
                'status' => 'success',
                'message' => 'Enquiry submitted and emails sent.',
                'emailSent' => $emailSent
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Enquiry submission failed', 'details' => $e->getMessage()]);
        }
        break;
        
    case 'admin/login':
        $username = $input['username'] ?? '';
        $password = $input['password'] ?? '';
        
        $expectedUser = env('ADMIN_USER', 'admin');
        $expectedPass = env('ADMIN_PASS', 'morya@admin123');
        
        if ($username === $expectedUser && $password === $expectedPass) {
            echo json_encode(['status' => 'success', 'token' => $ADMIN_TOKEN]);
        } else {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid username or password.']);
        }
        break;
        
    case 'admin/appointments':
        verifyAdminToken($ADMIN_TOKEN);
        $records = getDbRecords($db_file);
        echo json_encode(['appointments' => $records['appointments']]);
        break;
        
    case 'admin/enquiries':
        verifyAdminToken($ADMIN_TOKEN);
        $records = getDbRecords($db_file);
        echo json_encode(['enquiries' => $records['enquiries']]);
        break;
        
    default:
        http_response_code(404);
        echo json_encode(['error' => 'API endpoint not found.']);
        break;
}
