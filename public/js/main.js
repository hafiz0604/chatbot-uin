// Fungsi cek expired JWT (front-end)
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    return true; // error = anggap token expired
  }
}

// Cek login sebelum masuk home, dan cek expired
const token = localStorage.getItem('token');
if (!token || isTokenExpired(token)) {
  alert('Sesi Anda telah habis, silakan login ulang.');
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  window.location.href = 'login.html';
}

// Scroll smooth ke section saat klik menu navigasi
function scrollToSection(event, sectionId) {
  event.preventDefault();
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: 'smooth' });
  }
}

// Toggle FAQ
document.querySelectorAll('#faq .faq-question').forEach(question => {
  question.addEventListener('click', () => {
    const item = question.parentElement;
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('#faq .faq-item').forEach(i => i.classList.remove('open'));
    if (!isOpen) {
      item.classList.add('open');
      question.setAttribute('aria-expanded', 'true');
    } else {
      question.setAttribute('aria-expanded', 'false');
    }
  });
  question.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      question.click();
    }
  });
});

// Tombol Mulai Chat Sekarang arahkan ke halaman chat
document.getElementById('startChatBtn').addEventListener('click', () => {
  window.location.href = 'chat.html';
});

// Validasi dan submit form kontak
contactForm.addEventListener('submit', async function(e) {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('emailContact').value.trim();
  const message = document.getElementById('message').value.trim();

  if (!name) {
    alert('Nama harus diisi.');
    return;
  }
  if (!validateEmail(email)) {
    alert('Harap masukkan email yang valid.');
    return;
  }
  if (!message) {
    alert('Pesan harus diisi.');
    return;
  }

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ name, email, message })
    });
    if (res.ok) {
      alert('Terima kasih, pesan Anda telah dikirim ke email admin.');
      contactForm.reset();
    } else {
      alert('Terjadi kesalahan saat mengirim pesan.');
    }
  } catch (err) {
    alert('Gagal mengirim pesan. Coba lagi nanti.');
  }
});

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Konfirmasi logout
document.getElementById('logoutBtn').addEventListener('click', function(e) {
  if (!confirm('Apakah Anda yakin ingin logout?')) {
    e.preventDefault();
    return;
  }
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  window.location.href = 'login.html';
});

// Tampilkan ucapan selamat datang
const username = localStorage.getItem('username');
const welcomeEl = document.getElementById('welcomeMessage');

if (username && welcomeEl) {
  welcomeEl.textContent = `Halo, ${username}! Selamat datang di Chatbot Akademik.`;
}