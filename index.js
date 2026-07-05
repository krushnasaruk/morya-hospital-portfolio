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
    
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        
        // Inputs
        const nameInput = document.getElementById("user-name");
        const emailInput = document.getElementById("user-email");
        const reasonSelect = document.getElementById("enquiry-reason");
        const messageText = document.getElementById("user-message");
        
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
        
        if (isValid) {
            // Mock submission success
            console.log("Form submitted with details:", {
                name: nameInput.value.trim(),
                email: emailInput.value.trim(),
                reason: reasonSelect.value,
                message: messageText.value.trim(),
                file: fileInput.files.length > 0 ? fileInput.files[0].name : "None"
            });
            
            // Hide the form and show success message
            form.style.display = "none";
            successBanner.style.display = "block";
            
            // Scroll to the success banner smoothly
            successBanner.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    });

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
