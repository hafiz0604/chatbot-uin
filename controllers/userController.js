const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'rahasia_anda';

// Register user baru
exports.register = async (req, res) => {
  console.log('Controller register dipanggil');
  
  try {
    // Pastikan req.body tidak undefined
    if (!req.body) {
      console.error('req.body undefined');
      return res.status(400).json({ error: 'Data pendaftaran kosong' });
    }
    
    const { username, password, email, name } = req.body;
    console.log('Data dari request body:', { username, email, name, passwordLength: password ? password.length : 0 });
    
    // Validasi input dasar
    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Data pendaftaran tidak lengkap' });
    }
    
    // Validasi lebih detail
    if (typeof username !== 'string' || username.length < 4) {
      return res.status(400).json({ error: 'Username wajib minimal 4 karakter.' });
    }
    
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password wajib minimal 6 karakter.' });
    }
    
    if (!email.endsWith('@student.uin-suka.ac.id')) {
      return res.status(400).json({ error: 'Email harus menggunakan domain student.uin-suka.ac.id' });
    }
    
    // Verifikasi bahwa model User sudah benar
    console.log('Model User type:', typeof User);
    console.log('Model User methods:', Object.keys(User));
    
    // Cek username dan email duplikat - dengan error handling yang lebih baik
    try {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(409).json({ error: 'Username sudah dipakai.' });
      }
      
      const emailUser = await User.findOne({ email });
      if (emailUser) {
        return res.status(409).json({ error: 'Email sudah dipakai.' });
      }
    } catch (err) {
      console.error('Error saat findOne:', err);
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);
    
    // Buat user baru
    const user = new User({ 
      username, 
      password: hashed, 
      email,
      name: name || username
    });
    
    // Simpan ke database
    await user.save();
    console.log('User berhasil disimpan:', username);
    
    // Kirim respons sukses
    return res.status(201).json({ message: 'Registrasi berhasil!' });
  } catch (err) {
    console.error('Error dalam proses register:', err);
    return res.status(500).json({ error: 'Registrasi gagal: ' + err.message });
  }
};

// Login user
exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi.' });
  }
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Username tidak ditemukan!' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Password salah!' });

    // Buat JWT tanpa password di payload
    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '2h' }
    );
    
    // Tambahkan user information di response
    res.json({ 
      token, 
      username: user.username,
      name: user.name || user.username,
      email: user.email
    });
  } catch (err) {
    console.error('Error saat login:', err);
    res.status(500).json({ error: 'Login gagal: ' + err.message });
  }
};
// (Optional) Dapatkan profil user (hanya jika sudah login & pakai middleware auth)
exports.profile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' });
    res.json({ user });
  } catch (err) {
    console.error('Error saat ambil profil:', err);
    res.status(500).json({ error: 'Gagal mengambil profil: ' + err.message });
  }
};