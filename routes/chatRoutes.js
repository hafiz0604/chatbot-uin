const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middlewares/authMiddleware'); // Tambahkan import middleware

// Endpoint untuk mendapatkan user yang sedang login
router.get('/me', authenticateToken, (req, res) => {
  console.log('🔍 /api/chats/me endpoint hit');
  console.log('User:', req.user);

  if (req.user) {
    console.log('✅ User found in req.user:', req.user);
    return res.json({
      username: req.user.username,
      email: req.user.email
    });
  }

  console.log('❌ No user found in session');
  res.status(401).json({ error: 'User not authenticated' });
});

// Tambahkan authenticateToken ke rute yang perlu autentikasi
router.get('/threads/:username', authenticateToken, chatController.getUserThreads);
router.delete('/:username/thread/:threadId', authenticateToken, chatController.deleteThread);
router.get('/:username/messages', authenticateToken, chatController.getThreadMessages);
router.get('/user/:username', authenticateToken, chatController.getThreadMessages);
router.post('/:username/messages', authenticateToken, chatController.saveMessage);
router.post('/', authenticateToken, chatController.saveMessage);

// Rute bot tidak memerlukan autentikasi token karena mungkin dipanggil oleh sistem
router.post('/bot', chatController.chatBotHandler);

module.exports = router;