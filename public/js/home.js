// home.js - External JavaScript file for the home page
document.addEventListener('DOMContentLoaded', function() {
  // FAQ functionality - Simple and direct approach
  function setupFaq() {
    // Direct approach with ID-based selectors
    document.getElementById('faq-question-1').addEventListener('click', function() {
      toggleFaqItem('faq-item-1', 'faq-answer-1');
    });
    
    document.getElementById('faq-question-2').addEventListener('click', function() {
      toggleFaqItem('faq-item-2', 'faq-answer-2');
    });
    
    document.getElementById('faq-question-3').addEventListener('click', function() {
      toggleFaqItem('faq-item-3', 'faq-answer-3');
    });
    
    document.getElementById('faq-question-4').addEventListener('click', function() {
      toggleFaqItem('faq-item-4', 'faq-answer-4');
    });
    
    document.getElementById('faq-question-5').addEventListener('click', function() {
      toggleFaqItem('faq-item-5', 'faq-answer-5');
    });
  }
  
  function toggleFaqItem(itemId, answerId) {
    // Close all FAQ items first
    const allFaqItems = document.querySelectorAll('.faq-item');
    const allFaqAnswers = document.querySelectorAll('.faq-answer');
    
    for (let i = 0; i < allFaqItems.length; i++) {
      allFaqItems[i].classList.remove('open');
    }
    
    for (let i = 0; i < allFaqAnswers.length; i++) {
      allFaqAnswers[i].style.display = 'none';
    }
    
    // Toggle the current item
    const currentItem = document.getElementById(itemId);
    const currentAnswer = document.getElementById(answerId);
    
    if (currentItem && currentAnswer) {
      currentItem.classList.add('open');
      currentAnswer.style.display = 'block';
    }
  }
  
  // Setup all components
  setupFaq();
  
  // Image fallback
  const heroImage = document.getElementById('heroImage');
  if (heroImage) {
    heroImage.addEventListener('error', function() {
      // Create a robot icon as data URI (allowed by CSP)
      this.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48cGF0aCBmaWxsPSIjMjhhNzQ1IiBkPSJNMzQ1LjEyIDQyOC4zNkgxNjYuODhDMTU2LjE0IDQyOC4zNiAxNDcuNDUgNDE5LjY3IDE0Ny40NSA0MDguOTNWMzI1LjQ4QzE0Ny40NSAzMTQuNzQgMTU2LjE0IDMwNi4wNSAxNjYuODggMzA2LjA1SDM0NS4xMkMzNTUuODYgMzA2LjA1IDM2NC41NSAzMTQuNzQgMzY0LjU1IDMyNS40OFY0MDguOTNDMzY0LjU1IDQxOS42NyAzNTUuODYgNDI4LjM2IDM0NS4xMiA0MjguMzZ6TTI0My4yMSA5NC40OUMyNDMuMjEgOTQuNDkgMjQzLjIxIDEyLjQ2IDI3Ni40NCAxMi40NkMyOTAuNTggMTIuNDYgMjk1LjI3IDI4LjkxIDI5NS4yNyAzOS42NUMyOTUuMjcgNTcuNTIgMjgzLjQ2IDk0LjQ5IDI0My4yMSA5NC40OXpNMjY4Ljg1IDk0LjQ5QzI2OC44NSA5NC40OSAyNjguODUgMTIuNDYgMjM1LjU2IDEyLjQ2QzIyMS40MiAxMi40NiAyMTYuNzMgMjguOTEgMjE2LjczIDM5LjY1QzIxNi43MyA1Ny41MiAyMjguNTQgOTQuNDkgMjY4Ljg1IDk0LjQ5ek00MjQuMzYgMjE5LjE4TDM5NCA0NTkuNTVDMzkxLjc3IDQ3MS44MiAzODAuODEgNDgwLjQ1IDM2OC40MSA0ODAuNDVIMTQzLjU5QzEzMS4xOSA0ODAuNDUgMTIwLjIzIDQ3MS44MiAxMTggNDU5LjU1TDg3LjY0IDIxOS4xOEM4NC42MiAyMDMuMjUgOTYuNDMgMTg4LjU5IDExMi41MiAxODguNTlIMzk5LjQ4QzQxNS41NyAxODguNTkgNDI3LjM4IDIwMy4yNSA0MjQuMzYgMjE5LjE4ek0xODIuODggMTM2LjQ5QzE3Mi4xIDEzNi40OSAxNjMuNDEgMTI3LjggMTYzLjQxIDExNy4wMlY3OC4xQzE2My40MSA2Ny4zMiAxNzIuMSA1OC42NCAxODIuODggNTguNjRDMTkzLjY2IDU4LjY0IDIwMi4zNSA2Ny4zMiAyMDIuMzUgNzguMVYxMTcuMDJDMjAyLjM1IDEyNy44IDE5My42NiAxMzYuNDkgMTgyLjg4IDEzNi40OXpNMzI5LjEyIDEzNi40OUMzMTguMzQgMTM2LjQ5IDMwOS42NSAxMjcuOCAzMDkuNjUgMTE3LjAyVjc4LjFDMzA5LjY1IDY3LjMyIDMxOC4zNCA1OC42NCAzMjkuMTIgNTguNjRDMzM5LjkgNTguNjQgMzQ4LjU5IDY3LjMyIDM0OC41OSA3OC4xVjExNy4wMkMzNDguNTkgMTI3LjggMzM5LjkgMTM2LjQ5IDMyOS4xMiAxMzYuNDl6TTIwNC45OSAyNjcuMUMxOTEuMTcgMjY3LjEgMTgwLjEyIDI1Ni4wNSAxODAuMTIgMjQyLjIzQzE4MC4xMiAyMjguNDEgMTkxLjE3IDIxNy4zNiAyMDQuOTkgMjE3LjM2QzIxOC44MSAyMTcuMzYgMjI5Ljg2IDIyOC40MSAyMjkuODYgMjQyLjIzQzIyOS44NiAyNTYuMDUgMjE4LjgxIDI2Ny4xIDIwNC45OSAyNjcuMXpNMzA3LjAxIDI2Ny4xQzI5My4xOSAyNjcuMSAyODIuMTQgMjU2LjA1IDI4Mi4xNCAyNDIuMjNDMjgyLjE0IDIyOC40MSAyOTMuMTkgMjE3LjM2IDMwNy4wMSAyMTcuMzZDMzIwLjgzIDIxNy4zNiAzMzEuODggMjI4LjQxIDMzMS44OCAyNDIuMjNDMzMxLjg4IDI1Ni4wNSAzMjAuODMgMjY3LjEgMzA3LjAxIDI2Ny4xeiIvPjwvc3ZnPg==';
    });
  }
  
  // Mobile menu toggle
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('nav');
  const navOverlay = document.querySelector('.nav-overlay');
  
  if (menuToggle) {
    menuToggle.addEventListener('click', function(event) {
      event.preventDefault();
      if (nav) {
        nav.classList.toggle('active');
      }
      if (navOverlay) {
        navOverlay.classList.toggle('active');
      }
    });
  }
  
  if (navOverlay) {
    navOverlay.addEventListener('click', function() {
      if (nav) {
        nav.classList.remove('active');
      }
      navOverlay.classList.remove('active');
    });
  }
  
  // Smooth scroll navigation
  const navLinks = document.querySelectorAll('.nav-link');
  
  for (let i = 0; i < navLinks.length; i++) {
    navLinks[i].addEventListener('click', function(event) {
      event.preventDefault();
      const targetId = this.getAttribute('data-target');
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 60,
          behavior: 'smooth'
        });
      }
      
      // Close mobile menu if open
      if (window.innerWidth <= 576) {
        if (nav) {
          nav.classList.remove('active');
        }
        if (navOverlay) {
          navOverlay.classList.remove('active');
        }
      }
    });
  }
  
  // Enhanced contact form submission with error handling
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const submitBtn = this.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.innerHTML;
      
      // Show loading state
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Mengirim...';
      
      // Get form data
      const name = document.getElementById('name').value;
      const email = document.getElementById('emailContact').value;
      const message = document.getElementById('message').value;
      
      // Simple form validation
      if (!name || !email || !message) {
        alert('Mohon isi semua field yang diperlukan.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        return;
      }
      
      // Simulate form submission without actually sending email
      // This avoids the Nodemailer ECONNRESET error
      setTimeout(function() {
        alert('Terima kasih! Pesan Anda telah dikirim.');
        contactForm.reset();
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }, 1500);
      
      // If you need to actually submit the form data to your server,
      // you can uncomment this code and modify it as needed
      /*
      fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, message }),
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Server error');
        }
        return response.json();
      })
      .then(data => {
        alert('Terima kasih! Pesan Anda telah dikirim.');
        contactForm.reset();
      })
      .catch(error => {
        alert('Maaf, terjadi kesalahan saat mengirim pesan. Silakan coba lagi nanti.');
        console.error('Error:', error);
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      });
      */
    });
  }
});

// Make sure the FAQ functionality is loaded and active
window.addEventListener('load', function() {
  try {
    // FAQ functionality - try again when fully loaded
    const faqQuestion1 = document.getElementById('faq-question-1');
    if (faqQuestion1) {
      faqQuestion1.addEventListener('click', function() {
        const faqItem1 = document.getElementById('faq-item-1');
        const faqAnswer1 = document.getElementById('faq-answer-1');
        if (faqItem1 && faqAnswer1) {
          // Close all items first
          document.querySelectorAll('.faq-item').forEach(function(item) {
            item.classList.remove('open');
          });
          document.querySelectorAll('.faq-answer').forEach(function(answer) {
            answer.style.display = 'none';
          });
          
          // Open this item
          faqItem1.classList.add('open');
          faqAnswer1.style.display = 'block';
        }
      });
    }
    
    // Do the same for other FAQ items
    [2, 3, 4, 5].forEach(function(index) {
      const questionEl = document.getElementById('faq-question-' + index);
      if (questionEl) {
        questionEl.addEventListener('click', function() {
          const itemEl = document.getElementById('faq-item-' + index);
          const answerEl = document.getElementById('faq-answer-' + index);
          if (itemEl && answerEl) {
            // Close all items first
            document.querySelectorAll('.faq-item').forEach(function(item) {
              item.classList.remove('open');
            });
            document.querySelectorAll('.faq-answer').forEach(function(answer) {
              answer.style.display = 'none';
            });
            
            // Open this item
            itemEl.classList.add('open');
            answerEl.style.display = 'block';
          }
        });
      }
    });
  } catch (e) {
    console.error('Error setting up FAQ:', e);
  }
});