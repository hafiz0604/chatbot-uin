require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer'); // Tambahkan ini

const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const dialogflowRoutes = require('./routes/dialogflowRoutes');
const siaRoutes = require('./routes/siaRoutes');
const dialogflowWebhook = require('./routes/dialogflowWebhook');
const qaRoutes = require('./routes/qaRoutes');

const app = express();

const URL_BASE = process.env.BASE_URL

// Middleware
app.use(helmet());
app.use(cors({
  origin: [{URL_BASE}], // ganti dengan domain production kamu
}));
app.use(express.json());
app.use(morgan('dev'));

// Rate limiter (lebih ketat, misal 5 menit, max 50 request)
const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 menit
  max: 100,
  message: 'Terlalu banyak permintaan, coba lagi nanti.'
});
app.use('/api/', apiLimiter);

// Koneksi database
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true, useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// Register routes
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/dialogflow', dialogflowRoutes);
// Perbaikan: jangan tabrakan endpoint dialogflow, beri prefix khusus untuk webhook
app.use('/api/dialogflow/webhook', dialogflowWebhook);
app.use('/api/sia', siaRoutes);
app.use('/api', qaRoutes);

// ========== ROUTE UNTUK KONTAK: KIRIM EMAIL ==========
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Nama, email, dan pesan wajib diisi.' });
  }

  // Konfigurasi transporter Gmail/SMTP
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,     // Email pengirim
      pass: process.env.EMAIL_PASS      // APP password Gmail (bukan password biasa!)
    }
  });

  // Email yang akan dikirim
  let mailOptions = {
    from: `"Chatbot Akademik" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_TO, // Email admin/tujuan
    subject: `Pesan Kontak dari ${name}`,
    text: `Nama: ${name}\nEmail: ${email}\nPesan:\n${message}`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: 'Pesan berhasil dikirim ke email admin.' });
  } catch (err) {
    console.error('Nodemailer error:', err);
    res.status(500).json({ success: false, message: 'Gagal mengirim email.', error: err.toString() });
  }
});

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Error handler global (pastikan di paling bawah)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
});

// Jalankan server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));