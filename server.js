require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan'); // opsional
const mongoose = require('mongoose'); // jika pakai MongoDB

// Import routes
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const dialogflowRoutes = require('./routes/dialogflowRoutes');
const siaRoutes = require('./routes/siaRoutes');
const dialogflowWebhook = require('./routes/dialogflowWebhook');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Koneksi database (jika pakai MongoDB)
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true, useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// Register routes
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/dialogflow', dialogflowRoutes);
app.use('/api/sia', siaRoutes);
app.use('/api/dialogflow', dialogflowWebhook);

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Jalankan server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { ... });
