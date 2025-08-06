const express = require('express');
const router = express.Router();
const Chat = require('../models/chat');

// Ambil semua pesan dalam thread tertentu
router.get('/user/:username', async (req, res) => {
  const { username } = req.params;
  const { threadId } = req.query;
  try {
    const chats = await Chat.find({ username, threadId }).sort({ createdAt: 1 });
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil chat.' });
  }
});

// Simpan pesan
router.post('/', async (req, res) => {
  try {
    const { username, message, sender, threadId } = req.body;
    const chat = new Chat({ username, message, sender, threadId });
    await chat.save();
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: 'Gagal menyimpan chat.' });
  }
});

// Ambil daftar semua thread milik user (untuk sidebar)
router.get('/threads/:username', async (req, res) => {
  try {
    const threads = await Chat.aggregate([
      { $match: { username: req.params.username } },
      { $group: { _id: "$threadId", lastMessage: { $last: "$message" }, lastAt: { $last: "$createdAt" } } },
      { $sort: { lastAt: -1 } }
    ]);
    res.json(threads);
  } catch (e) {
    res.status(500).json({ error: "Gagal mengambil thread." });
  }
});

// Hapus semua chat pada thread tertentu milik user
router.delete('/thread/:username/:threadId', async (req, res) => {
  const { threadId } = req.params;
  try {
    await Chat.deleteMany({ threadId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus thread.' });
  }
});

module.exports = router;