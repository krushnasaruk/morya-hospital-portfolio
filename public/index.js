// --- Booking Logic ---
const form = document.getElementById('bookingForm');
const statusMessage = document.getElementById('statusMessage');
let config = { disablePayments: true, amount: 25000, razorpayKeyId: '' };

async function loadConfig() {
  try {
    const response = await fetch('/api/config');
    config = await response.json();
    if (config.disablePayments) {
      statusMessage.textContent = 'Payments disabled. Booking will complete without Razorpay in preview.';
    }
  } catch (error) {
    console.error('Unable to load config', error);
  }
}

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.style.color = isError ? '#ff0000' : '#4caf50'; 
}

async function submitBooking(event) {
  event.preventDefault();
  setStatus('Processing your booking...', false);
  statusMessage.style.color = '#333'; // reset color

  const formData = new FormData(form);
  const booking = Object.fromEntries(formData.entries());
  booking.amount = config.amount;

  if (config.disablePayments) {
    await completeBooking({
      ...booking,
      razorpayPaymentId: 'TEST_PAYMENT_ID',
      razorpayOrderId: `TEST_ORDER_${Date.now()}`,
      razorpaySignature: 'TEST_SIGNATURE',
    });
    return;
  }

  try {
    const orderResponse = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking),
    });

    const orderData = await orderResponse.json();
    if (!orderResponse.ok) {
      throw new Error(orderData.error || 'Order creation failed');
    }

    const options = {
      key: config.razorpayKeyId,
      amount: orderData.amount,
      currency: orderData.currency,
      order_id: orderData.orderId,
      name: 'Sexology Clinic',
      description: 'Consultation Booking',
      handler: async function (response) {
        await completeBooking({
          ...booking,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpayOrderId: response.razorpay_order_id,
          razorpaySignature: response.razorpay_signature,
        });
      },
      theme: { color: '#cca111' },
      modal: { backdropclose: false },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Unable to complete payment.', true);
  }
}

async function completeBooking(payload) {
  try {
    const response = await fetch('/api/book-appointment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Booking failed');
    }
    setStatus('Booking confirmed! Check your email for confirmation.');
    form.reset();
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Unable to book appointment.', true);
  }
}

form.addEventListener('submit', submitBooking);
window.addEventListener('load', loadConfig);

document.addEventListener('DOMContentLoaded', () => {
  const showMoreBtn = document.getElementById('showMoreCertsBtn');
  const certGrid = document.querySelector('.cert-grid');
  if(showMoreBtn && certGrid) {
    showMoreBtn.addEventListener('click', () => {
      certGrid.classList.toggle('show-all');
      if(certGrid.classList.contains('show-all')) {
        showMoreBtn.textContent = 'Show Less';
      } else {
        showMoreBtn.textContent = 'Read More';
      }
    });
  }

  // --- Testimonials Carousel Logic ---
  const slides = document.querySelectorAll('.testimonial-slide');
  const prevBtn = document.getElementById('prevTestiBtn');
  const nextBtn = document.getElementById('nextTestiBtn');
  const dotsContainer = document.getElementById('carouselDots');
  
  if (slides.length > 0) {
    let currentSlide = 0;
    let slideInterval;
    const intervalTime = 5000; // 5 seconds
    
    // Generate dots dynamically
    slides.forEach((_, index) => {
      const dot = document.createElement('button');
      dot.classList.add('carousel-dot');
      if (index === 0) dot.classList.add('active');
      dot.setAttribute('aria-label', `Go to testimonial slide ${index + 1}`);
      dot.addEventListener('click', () => {
        goToSlide(index);
        resetTimer();
      });
      if (dotsContainer) {
        dotsContainer.appendChild(dot);
      }
    });
    
    const dots = document.querySelectorAll('.carousel-dot');
    
    function goToSlide(n) {
      slides[currentSlide].classList.remove('active');
      if (dots.length > 0 && dots[currentSlide]) {
        dots[currentSlide].classList.remove('active');
      }
      
      currentSlide = (n + slides.length) % slides.length;
      
      slides[currentSlide].classList.add('active');
      if (dots.length > 0 && dots[currentSlide]) {
        dots[currentSlide].classList.add('active');
      }
    }
    
    function nextSlide() {
      goToSlide(currentSlide + 1);
    }
    
    function prevSlide() {
      goToSlide(currentSlide - 1);
    }
    
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        prevSlide();
        resetTimer();
      });
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        nextSlide();
        resetTimer();
      });
    }
    
    function startTimer() {
      slideInterval = setInterval(nextSlide, intervalTime);
    }
    
    function resetTimer() {
      clearInterval(slideInterval);
      startTimer();
    }
    
    startTimer();
    
    const carouselContainer = document.querySelector('.testimonials-carousel');
    if (carouselContainer) {
      carouselContainer.addEventListener('mouseenter', () => {
        clearInterval(slideInterval);
      });
      carouselContainer.addEventListener('mouseleave', () => {
        startTimer();
      });
    }
  }
});

// --- Mobile Menu Toggle ---
document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.querySelector('.nav-links');
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
      });
    });
  }
});
// --- Brand Theme Toggle ---
document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    // Check local storage for theme preference
    if (localStorage.getItem('theme') === 'logo') {
      document.body.classList.add('theme-logo');
    }
    
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('theme-logo');
      if (document.body.classList.contains('theme-logo')) {
        localStorage.setItem('theme', 'logo');
      } else {
        localStorage.setItem('theme', 'default');
      }
    });
  }
});