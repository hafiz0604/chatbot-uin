document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded');
  
  // Fungsi validasi email
  function validateEmail(email) {
    const domain = '@student.uin-suka.ac.id';
    if (!email.endsWith(domain)) {
      alert('Harap gunakan email dengan domain ' + domain);
      return false;
    }
    return true;
  }

  // Dapatkan form registrasi
  const registerForm = document.getElementById('registerForm');
  const submitBtn = document.getElementById('submitBtn');
  
  if (registerForm) {
    console.log('Form register ditemukan');
    
    // Tambahkan event listener untuk submit form
    registerForm.addEventListener('submit', function(e) {
      // Cegah form dikirim secara default
      e.preventDefault();
      
      console.log('Form submit terdeteksi');
      
      // Simpan teks tombol asli
      const originalBtnText = submitBtn.innerHTML;
      
      // Tampilkan status loading
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
      
      // Ambil nilai form
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      
      console.log('Data form diambil:', { name, email });

      // Validasi form dasar
      if (!name || !email || !password || !confirmPassword) {
        alert('Mohon isi semua field yang diperlukan.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        return;
      }
      
      // Validasi domain email
      if (!validateEmail(email)) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        return;
      }

      // Periksa apakah password cocok
      if (password !== confirmPassword) {
        alert('Konfirmasi password tidak cocok.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        return;
      }

      // Ekstrak username dari email
      const username = email.split('@')[0];
      console.log('Username ekstrak:', username);

      // ========== GUNAKAN XHR ALIH-ALIH FETCH ==========
      console.log('Mengirim request ke API via XHR...');
      
      // Buat objek XMLHttpRequest
      var xhr = new XMLHttpRequest();
      
      // Buka koneksi
      xhr.open('POST', '/api/users/register', true);
      
      // Set header
      xhr.setRequestHeader('Content-Type', 'application/json');
      
      // Event handler untuk respon
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          console.log('XHR status:', xhr.status);
          console.log('XHR response:', xhr.responseText);
          
          // Parse response jika ada
          let data;
          try {
            data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
          } catch (e) {
            console.error('Error parsing JSON response:', e);
            data = { error: 'Format respons server tidak valid' };
          }
          
          // Periksa status
          if (xhr.status >= 200 && xhr.status < 300) {
            alert('Pendaftaran berhasil! Silahkan login.');
            window.location.href = 'login.html';
          } else {
            alert(data.error || 'Gagal membuat akun');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
          }
        }
      };
      
      // Error handler
      xhr.onerror = function(e) {
        console.error('❌ XHR error:', e);
        alert('Terjadi kesalahan saat menghubungi server');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      };
      
      // Timeout handler
      xhr.ontimeout = function() {
        console.error('❌ XHR timeout');
        alert('Permintaan timeout, server tidak merespon');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      };
      
      // Set timeout untuk menghindari permintaan menggantung
      xhr.timeout = 10000; // 10 detik
      
      // Kirim data
      const data = JSON.stringify({ username, password, email, name });
      console.log('Data yang dikirim:', data);
      xhr.send(data);
    });
  } else {
    console.error('Form registerForm tidak ditemukan!');
  }
});