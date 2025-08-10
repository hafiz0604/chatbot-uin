// login.js - JavaScript untuk halaman login
document.addEventListener('DOMContentLoaded', function() {
  // Fungsi validasi email
  function validateEmail(email) {
    const domain = '@student.uin-suka.ac.id';
    return email.endsWith(domain);
  }

  const loginForm = document.getElementById('loginForm');
  
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Ambil tombol submit dan simpan teks aslinya
      const submitBtn = this.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.innerHTML;
      
      // Tampilkan status loading
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
      
      // Ambil data form
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value.trim();
      
      // Validasi email
      if (!validateEmail(email)) {
        alert('Harap gunakan email dengan domain @student.uin-suka.ac.id');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        return;
      }
      
      // Validasi password
      if (password === '') {
        alert('Password tidak boleh kosong');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        return;
      }
      
      // Ekstrak username dari email
      const username = email.split('@')[0];
      
      try {
        const res = await fetch('/api/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok && data.token) {
          // Simpan token ke localStorage
          localStorage.setItem('token', data.token);
          
          // Simpan informasi lengkap user sebagai JSON string
          const userData = {
            username: username,
            email: email,
            name: data.name || username // Gunakan nama dari response jika ada, jika tidak gunakan username
          };
          
          // Simpan userData sebagai currentUser di localStorage
          localStorage.setItem('currentUser', JSON.stringify(userData));
          
          // Untuk kompatibilitas dengan kode lama, tetap simpan username
          localStorage.setItem('username', username);
          
          // Redirect ke halaman chat
          window.location.href = 'chat.html';
        } else {
          alert(data.error || 'Login gagal');
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
      } catch (err) {
        console.error('🔴 Login error:', err);
        alert('Terjadi kesalahan saat login');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    });
  } else {
    console.error('Form login tidak ditemukan!');
  }
  
  // Cek jika user sudah login (token masih ada)
  const token = localStorage.getItem('token');
  if (token) {
    // Opsional: validasi token dengan server sebelum redirect
    // Untuk sementara, langsung redirect saja
    window.location.href = 'chat.html';
  }
});