document.addEventListener('DOMContentLoaded', () => {
  const showMoreBtn = document.getElementById('showMoreCertsBtn');
  const certGrid = document.querySelector('.cert-grid');
  if(showMoreBtn && certGrid) {
    showMoreBtn.addEventListener('click', () => {
      certGrid.classList.toggle('show-all');
      const activeLang = document.documentElement.lang || 'en';
      const trans = window.clinicTranslations[activeLang] || {};
      if(certGrid.classList.contains('show-all')) {
        showMoreBtn.textContent = trans['certs-show-less'] || 'Show Less';
      } else {
        showMoreBtn.textContent = trans['certs-read-more'] || 'Read More';
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
// --- Dynamic Client-Side Language Switcher (EN, MR, HI) ---
function applyLanguage(lang) {
  const translations = window.clinicTranslations[lang];
  if (!translations) return;
  
  // Update button active state
  document.querySelectorAll('.lang-btn').forEach(btn => {
    if (btn.getAttribute('data-lang') === lang) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Apply translations to all tags with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const text = translations[key];
    if (text) {
      if (text.includes('<') && text.includes('>')) {
        el.innerHTML = text;
      } else {
        el.textContent = text;
      }
    }
  });
  
  // Dynamically update show more certificates button text if present
  const certGrid = document.querySelector('.cert-grid');
  const showMoreBtn = document.getElementById('showMoreCertsBtn');
  if (showMoreBtn && certGrid) {
    if (certGrid.classList.contains('show-all')) {
      showMoreBtn.textContent = translations['certs-show-less'] || 'Show Less';
    } else {
      showMoreBtn.textContent = translations['certs-read-more'] || 'Read More';
    }
  }
  
  document.documentElement.lang = lang;
  localStorage.setItem('lang', lang);
}

document.addEventListener('DOMContentLoaded', () => {
  const savedLang = localStorage.getItem('lang') || 'en';
  applyLanguage(savedLang);

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const lang = e.currentTarget.getAttribute('data-lang');
      applyLanguage(lang);
    });
  });
});
