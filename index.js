/* ==========================================================================
   MORYA MULTI SPECIALITY HOSPITAL JAVASCRIPT
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    
    /* ==========================================
       1. STICKY NAVBAR & SCROLL TO TOP
       ========================================== */
    const navbar = document.getElementById("main-navbar");
    const scrollTopBtn = document.getElementById("scroll-top");
    
    window.addEventListener("scroll", () => {
        // Sticky navbar shadow
        if (window.scrollY > 50) {
            navbar.classList.add("scrolled");
        } else {
            navbar.classList.remove("scrolled");
        }
        
        // Scroll to top button visibility
        if (window.scrollY > 300) {
            scrollTopBtn.classList.add("visible");
        } else {
            scrollTopBtn.classList.remove("visible");
        }
    });
    
    scrollTopBtn.addEventListener("click", () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });

    /* ==========================================
       2. MOBILE MENU & ACCORDION NAVIGATION
       ========================================== */
    const menuToggle = document.getElementById("menu-toggle");
    const navLinks = document.getElementById("nav-links");
    const dropdowns = document.querySelectorAll(".dropdown");
    
    menuToggle.addEventListener("click", () => {
        navLinks.classList.toggle("open");
        // Change hamburger icon to close mark
        const icon = menuToggle.querySelector("i");
        if (navLinks.classList.contains("open")) {
            icon.className = "fa-solid fa-xmark";
        } else {
            icon.className = "fa-solid fa-bars";
        }
    });
    
    // Dropdown toggles for mobile layouts
    dropdowns.forEach(dropdown => {
        const link = dropdown.querySelector(".nav-link");
        link.addEventListener("click", (e) => {
            if (window.innerWidth <= 992) {
                e.preventDefault(); // Prevent jump link
                dropdown.classList.toggle("active");
            }
        });
    });
    
    // Close mobile menu when clicking a link
    document.querySelectorAll(".nav-links a:not(.dropdown > .nav-link)").forEach(link => {
        link.addEventListener("click", () => {
            if (window.innerWidth <= 992) {
                navLinks.classList.remove("open");
                menuToggle.querySelector("i").className = "fa-solid fa-bars";
            }
        });
    });

    /* ==========================================
       3. HERO SLIDER CAROUSEL
       ========================================== */
    const slides = document.querySelectorAll("#hero-slider .slide");
    const dots = document.querySelectorAll("#slider-dots .dot");
    const prevBtn = document.getElementById("prev-slide");
    const nextBtn = document.getElementById("next-slide");
    let currentSlide = 0;
    let slideInterval;
    
    const showSlide = (n) => {
        slides.forEach(slide => slide.classList.remove("active"));
        dots.forEach(dot => dot.classList.remove("active"));
        
        currentSlide = (n + slides.length) % slides.length;
        
        slides[currentSlide].classList.add("active");
        dots[currentSlide].classList.add("active");
    };
    
    const nextSlide = () => {
        showSlide(currentSlide + 1);
    };
    
    const prevSlide = () => {
        showSlide(currentSlide - 1);
    };
    
    const startSlideShow = () => {
        stopSlideShow();
        slideInterval = setInterval(nextSlide, 7000); // Auto slide every 7s
    };
    
    const stopSlideShow = () => {
        if (slideInterval) clearInterval(slideInterval);
    };
    
    // Click controls
    nextBtn.addEventListener("click", () => {
        nextSlide();
        startSlideShow(); // reset timer
    });
    
    prevBtn.addEventListener("click", () => {
        prevSlide();
        startSlideShow(); // reset timer
    });
    
    dots.forEach((dot, index) => {
        dot.addEventListener("click", () => {
            showSlide(index);
            startSlideShow();
        });
    });
    
    // Hover controls to freeze slider
    const heroSection = document.querySelector(".hero-carousel");
    heroSection.addEventListener("mouseenter", stopSlideShow);
    heroSection.addEventListener("mouseleave", startSlideShow);
    
    // Initialize hero slide show
    startSlideShow();

    /* ==========================================
       4. TESTIMONIALS SLIDER
       ========================================== */
    const reviews = document.querySelectorAll("#reviews-slider .review-card");
    const rDots = document.querySelectorAll("#reviews-dots .r-dot");
    let currentReview = 0;
    
    const showReview = (n) => {
        reviews.forEach(review => review.classList.remove("active"));
        rDots.forEach(dot => dot.classList.remove("active"));
        
        currentReview = (n + reviews.length) % reviews.length;
        
        reviews[currentReview].classList.add("active");
        rDots[currentReview].classList.add("active");
    };
    
    rDots.forEach((dot, index) => {
        dot.addEventListener("click", () => {
            showReview(index);
        });
    });
    
    // Auto cycle reviews
    setInterval(() => {
        showReview(currentReview + 1);
    }, 6000);

    /* ==========================================
       5. FAQ ACCORDION
       ========================================== */
    const accordionHeaders = document.querySelectorAll(".accordion-header");
    
    accordionHeaders.forEach(header => {
        header.addEventListener("click", () => {
            const item = header.parentElement;
            const content = header.nextElementSibling;
            const isAlreadyActive = item.classList.contains("active");
            
            // Collapse all other accordion items
            document.querySelectorAll(".accordion-item").forEach(otherItem => {
                otherItem.classList.remove("active");
                otherItem.querySelector(".accordion-content").style.maxHeight = null;
                // Change minus back to plus
                otherItem.querySelector(".icon-plus").className = "fa-solid fa-plus icon-plus";
            });
            
            // Toggle clicked item
            if (!isAlreadyActive) {
                item.classList.add("active");
                content.style.maxHeight = content.scrollHeight + "px";
                header.querySelector(".icon-plus").className = "fa-solid fa-plus icon-plus";
            }
        });
    });

    /* ==========================================
       6. ENQUIRY FORM VALIDATION
       ========================================== */
    const form = document.getElementById("enquiry-form");
    const fileInput = document.getElementById("attachment");
    const fileNameDisplay = document.getElementById("file-name-text");
    const successBanner = document.getElementById("form-success-banner");
    
    // Show selected attachment filename
    fileInput.addEventListener("change", () => {
        if (fileInput.files.length > 0) {
            fileNameDisplay.textContent = fileInput.files[0].name;
            fileNameDisplay.style.color = "var(--color-secondary)";
        } else {
            fileNameDisplay.textContent = "No file chosen";
            fileNameDisplay.style.color = "var(--color-gray)";
        }
    });
    
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        // Inputs
        const nameInput = document.getElementById("user-name");
        const emailInput = document.getElementById("user-email");
        const reasonSelect = document.getElementById("enquiry-reason");
        const messageText = document.getElementById("user-message");
        const submitBtn = document.getElementById("submit-enquiry-btn");
        const originalBtnText = submitBtn.textContent;
        
        let isValid = true;
        
        // Reset previous error classes
        document.querySelectorAll(".form-group").forEach(group => group.classList.remove("has-error"));
        
        // Name check
        if (nameInput.value.trim() === "") {
            nameInput.parentElement.classList.add("has-error");
            isValid = false;
        }
        
        // Email check
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(emailInput.value.trim())) {
            emailInput.parentElement.classList.add("has-error");
            isValid = false;
        }
        
        // Reason select check
        if (reasonSelect.value === "") {
            reasonSelect.parentElement.classList.add("has-error");
            isValid = false;
        }
        
        // Message check
        if (messageText.value.trim() === "") {
            messageText.parentElement.classList.add("has-error");
            isValid = false;
        }
        
        if (!isValid) return;

        const resetSubmitBtn = () => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        };

        submitBtn.disabled = true;

        if (reasonSelect.value === "appointment") {
            submitBtn.textContent = "Preparing Secure Payment...";
            
            try {
                // 1. Fetch public config (Key ID)
                const configRes = await fetch("/api/config");
                if (!configRes.ok) throw new Error("Could not fetch configuration");
                const { key_id } = await configRes.json();
                
                // 2. Create order on backend (amount will be set by server from .env)
                const orderRes = await fetch("/api/create-order", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reason: "appointment" })
                });
                
                if (!orderRes.ok) {
                    const errorData = await orderRes.json();
                    throw new Error(errorData.error || "Order creation failed");
                }
                const orderData = await orderRes.json();
                
                // 3. Configure Razorpay Standard Checkout
                const options = {
                    key: key_id,
                    amount: orderData.amount,
                    currency: orderData.currency,
                    name: "Morya Multispeciality Hospital",
                    description: "Appointment Booking Fee",
                    order_id: orderData.order_id,
                    handler: async function (response) {
                        submitBtn.textContent = "Verifying & Booking...";
                        try {
                            const bookingData = {
                                name: nameInput.value.trim(),
                                email: emailInput.value.trim(),
                                reason: reasonSelect.value,
                                message: messageText.value.trim(),
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature
                            };
                            
                            const bookRes = await fetch("/api/book-appointment", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(bookingData)
                            });
                            
                            const bookResult = await bookRes.json();
                            if (bookRes.ok) {
                                form.style.display = "none";
                                successBanner.querySelector("h4").textContent = "Appointment Booked Successfully!";
                                successBanner.querySelector("p").innerHTML = `Thank you, ${nameInput.value.trim()}. Your appointment has been confirmed. Payment ID: <strong>${response.razorpay_payment_id}</strong>. A confirmation email has been sent to you.`;
                                successBanner.style.display = "block";
                                successBanner.scrollIntoView({ behavior: "smooth", block: "nearest" });
                            } else {
                                alert("Failed to book appointment: " + bookResult.error);
                                resetSubmitBtn();
                            }
                        } catch (err) {
                            console.error("Verification error:", err);
                            alert("Payment successful, but verification failed. Please contact our support team.");
                            resetSubmitBtn();
                        }
                    },
                    prefill: {
                        name: nameInput.value.trim(),
                        email: emailInput.value.trim()
                    },
                    theme: {
                        color: "#0f70b7" // hospital theme primary color
                    },
                    modal: {
                        ondismiss: function () {
                            alert("Payment modal closed. Payment is required to confirm the appointment.");
                            resetSubmitBtn();
                        }
                    }
                };
                
                const rzp = new Razorpay(options);
                rzp.open();
                
            } catch (err) {
                console.error("Payment init error:", err);
                alert("Error initializing payment: " + err.message);
                resetSubmitBtn();
            }
        } else {
            // General enquiry (free)
            submitBtn.textContent = "Sending Enquiry...";
            try {
                const enquiryData = {
                    name: nameInput.value.trim(),
                    email: emailInput.value.trim(),
                    reason: reasonSelect.value,
                    message: messageText.value.trim()
                };
                
                const enqRes = await fetch("/api/submit-enquiry", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(enquiryData)
                });
                
                const enqResult = await enqRes.json();
                if (enqRes.ok) {
                    form.style.display = "none";
                    successBanner.querySelector("h4").textContent = "Enquiry Sent Successfully!";
                    successBanner.querySelector("p").textContent = "Thank you for reaching out. We have received your enquiry and sent you a confirmation email. Our desk will contact you soon.";
                    successBanner.style.display = "block";
                    successBanner.scrollIntoView({ behavior: "smooth", block: "nearest" });
                } else {
                    alert("Failed to submit enquiry: " + enqResult.error);
                    resetSubmitBtn();
                }
            } catch (err) {
                console.error("Enquiry submission error:", err);
                alert("Error submitting enquiry. Please try again.");
                resetSubmitBtn();
            }
        }
    });

    /* ==========================================
       6b. DETAILED BOOKING FORM VALIDATION & PROCESS
       ========================================== */
    const bookingForm = document.getElementById("booking-form");
    const bookingFileInput = document.getElementById("booking-attachment");
    const bookingFileNameDisplay = document.getElementById("booking-file-name-text");
    const bookingSuccessBanner = document.getElementById("booking-success-banner");

    // Display selected attachment name
    if (bookingFileInput) {
        bookingFileInput.addEventListener("change", () => {
            if (bookingFileInput.files.length > 0) {
                bookingFileNameDisplay.textContent = bookingFileInput.files[0].name;
                bookingFileNameDisplay.style.color = "var(--color-secondary)";
            } else {
                bookingFileNameDisplay.textContent = "No file chosen";
                bookingFileNameDisplay.style.color = "var(--color-gray)";
            }
        });
    }

    if (bookingForm) {
        bookingForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            // Inputs
            const nameInput = document.getElementById("booking-name");
            const phoneInput = document.getElementById("booking-phone");
            const emailInput = document.getElementById("booking-email");
            const ageInput = document.getElementById("booking-age");
            const genderInput = document.getElementById("booking-gender");
            const dateInput = document.getElementById("booking-date");
            const slotInput = document.getElementById("booking-slot");
            const doctorInput = document.getElementById("booking-doctor");
            const messageInput = document.getElementById("booking-message");
            const submitBtn = document.getElementById("submit-booking-btn");
            const originalBtnText = submitBtn.innerHTML;

            let isValid = true;

            // Reset errors
            bookingForm.querySelectorAll(".form-group").forEach(group => group.classList.remove("has-error"));

            // 1. Name Check
            if (nameInput.value.trim() === "") {
                nameInput.closest(".form-group").classList.add("has-error");
                isValid = false;
            }

            // 2. Phone Check (10 digit mobile regex)
            const phonePattern = /^[6-9]\d{9}$/;
            if (!phonePattern.test(phoneInput.value.trim())) {
                phoneInput.closest(".form-group").classList.add("has-error");
                isValid = false;
            }

            // 3. Email Check
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(emailInput.value.trim())) {
                emailInput.closest(".form-group").classList.add("has-error");
                isValid = false;
            }

            // 4. Age Check
            const ageVal = parseInt(ageInput.value, 10);
            if (isNaN(ageVal) || ageVal < 1 || ageVal > 120) {
                ageInput.closest(".form-group").classList.add("has-error");
                isValid = false;
            }

            // 5. Gender Check
            if (genderInput.value === "") {
                genderInput.closest(".form-group").classList.add("has-error");
                isValid = false;
            }

            // 6. Date Check
            if (dateInput.value === "") {
                dateInput.closest(".form-group").classList.add("has-error");
                isValid = false;
            }

            // 7. Time Slot Check
            if (slotInput.value === "") {
                slotInput.closest(".form-group").classList.add("has-error");
                isValid = false;
            }

            // 8. Doctor Check
            if (doctorInput.value === "") {
                doctorInput.closest(".form-group").classList.add("has-error");
                isValid = false;
            }

            // 9. Symptoms Check
            if (messageInput.value.trim() === "") {
                messageInput.closest(".form-group").classList.add("has-error");
                isValid = false;
            }

            if (!isValid) {
                // Scroll first error into view
                const firstError = bookingForm.querySelector(".has-error");
                if (firstError) {
                    firstError.scrollIntoView({ behavior: "smooth", block: "center" });
                }
                return;
            }

            const resetSubmitBtn = () => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            };

            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Preparing Payment Gate...`;

            try {
                // A. Fetch config (Key ID)
                const configRes = await fetch("/api/config");
                if (!configRes.ok) throw new Error("Could not load backend configurations.");
                const { key_id } = await configRes.json();

                // B. Create Order
                const orderRes = await fetch("/api/create-order", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reason: "appointment" })
                });

                if (!orderRes.ok) {
                    const errData = await orderRes.json();
                    throw new Error(errData.error || "Order generation failed.");
                }
                const orderData = await orderRes.json();

                // C. Initialize Checkout Modal
                const options = {
                    key: key_id,
                    amount: orderData.amount,
                    currency: orderData.currency,
                    name: "Morya Multispeciality Hospital",
                    description: "Appointment Booking Fee",
                    order_id: orderData.order_id,
                    handler: async function (response) {
                        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Finalizing Booking...`;
                        try {
                            const bookingData = {
                                name: nameInput.value.trim(),
                                phone: phoneInput.value.trim(),
                                email: emailInput.value.trim(),
                                age: ageInput.value.trim(),
                                gender: genderInput.value,
                                date: dateInput.value,
                                slot: slotInput.value,
                                doctor: doctorInput.value,
                                message: messageInput.value.trim(),
                                reason: "Book Appointment",
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature
                            };

                            const confirmRes = await fetch("/api/book-appointment", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(bookingData)
                            });

                            const confirmResult = await confirmRes.json();
                            if (confirmRes.ok) {
                                bookingForm.style.display = "none";
                                bookingSuccessBanner.querySelector(".success-text").innerHTML = 
                                    `Dear <strong>${nameInput.value.trim()}</strong>, your appointment slot has been successfully booked with <strong>${doctorInput.options[doctorInput.selectedIndex].text}</strong> for <strong>${dateInput.value}</strong> during the <strong>${slotInput.options[slotInput.selectedIndex].text}</strong>.<br><br>Payment ID: <strong>${response.razorpay_payment_id}</strong>.`;
                                bookingSuccessBanner.style.display = "block";
                                bookingSuccessBanner.scrollIntoView({ behavior: "smooth", block: "center" });
                            } else {
                                alert("Failed to book appointment: " + confirmResult.error);
                                resetSubmitBtn();
                            }
                        } catch (err) {
                            console.error(err);
                            alert("Payment succeeded but confirmation failed. Please contact reception with Payment ID: " + response.razorpay_payment_id);
                            resetSubmitBtn();
                        }
                    },
                    prefill: {
                        name: nameInput.value.trim(),
                        email: emailInput.value.trim(),
                        contact: phoneInput.value.trim()
                    },
                    theme: {
                        color: "#5c2008" // Burgundy primary theme color
                    },
                    modal: {
                        ondismiss: function () {
                            alert("Payment closed. Slot will not be confirmed until payment is processed.");
                            resetSubmitBtn();
                        }
                    }
                };

                const rzp = new Razorpay(options);
                rzp.open();

            } catch (err) {
                console.error(err);
                alert("Error: " + err.message);
                resetSubmitBtn();
            }
        });
    }

    /* ==========================================
       7. ROBOT CHATBOT ASSISTANT
       ========================================== */
    const chatToggle = document.getElementById("chat-toggle");
    const chatClose = document.getElementById("chat-close");
    const chatWindow = document.getElementById("chat-window");
    const chatInput = document.getElementById("chat-input");
    const chatSend = document.getElementById("chat-send");
    const chatMessages = document.getElementById("chat-messages");
    
    // Toggle Chat Window
    chatToggle.addEventListener("click", () => {
        chatWindow.classList.toggle("open");
    });
    
    chatClose.addEventListener("click", () => {
        chatWindow.classList.remove("open");
    });
    
    const appendMessage = (text, sender) => {
        const msgDiv = document.createElement("div");
        msgDiv.className = `message ${sender}-msg`;
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        msgDiv.innerHTML = `
            <p>${text}</p>
            <span class="msg-time">${timeStr}</span>
        `;
        
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to bottom
    };
    
    // Get Bot Response
    const getBotResponse = (userMsg) => {
        const msg = userMsg.toLowerCase();
        
        if (msg.includes("hello") || msg.includes("hi") || msg.includes("namaskar") || msg.includes("hey")) {
            return "Namaskar! How can I help you today? You can ask about treatments, doctors, appointments, or hospital location.";
        }
        if (msg.includes("appointment") || msg.includes("book") || msg.includes("consult")) {
            return "To book an appointment, please fill out the 'Send Enquiry' form on this page or call us directly at <strong>+91-7720941777</strong>. Our desk will confirm your slot.";
        }
        if (msg.includes("doctor") || msg.includes("founder") || msg.includes("rashmi") || msg.includes("vaibhav")) {
            return "Our founders and senior consultants are Dr. Rashmi Patil (Gynecology specialist) and Dr. Vaibhav Patil (General Surgeon). They hold OPD consultations daily.";
        }
        if (msg.includes("location") || msg.includes("address") || msg.includes("where")) {
            return "We are located at: Anudatta Commercial Complex, Opp. Abhiruchi Police Chowki, Wadgaon Budruk, Pune - 411041. Click the 'GET DIRECTION' button under the map card to navigate.";
        }
        if (msg.includes("timing") || msg.includes("time") || msg.includes("hours") || msg.includes("visit")) {
            return "Our Emergency room, ICU, and Pharmacy are open 24x7. General visitor timing is 10:00 AM - 12:00 PM and 5:00 PM - 7:00 PM.";
        }
        if (msg.includes("insurance") || msg.includes("cashless") || msg.includes("tpa")) {
            return "Yes, we offer cashless treatment facility with all major TPAs and health insurance companies. Please show your health card at the admission desk.";
        }
        if (msg.includes("icu") || msg.includes("dialysis") || msg.includes("bed")) {
            return "We have fully equipped ICU facilities, operative theaters, ventilators, and dialysis beds running 24x7 under specialist supervision.";
        }
        
        return "Thank you for your message. For immediate assistance regarding active admissions, OPD schedules, or pricing details, please call us directly at +91-7720941777.";
    };
    
    const handleSendMessage = () => {
        const text = chatInput.value.trim();
        if (text === "") return;
        
        // 1. Append User Message
        appendMessage(text, "user");
        chatInput.value = "";
        
        // 2. Disable Send input briefly
        chatInput.disabled = true;
        chatSend.disabled = true;
        
        // 3. Simulate Bot typing delay
        setTimeout(() => {
            const response = getBotResponse(text);
            appendMessage(response, "bot");
            chatInput.disabled = false;
            chatSend.disabled = false;
            chatInput.focus();
        }, 900);
    };
    
    chatSend.addEventListener("click", handleSendMessage);
    
    chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            handleSendMessage();
        }
    });

});
