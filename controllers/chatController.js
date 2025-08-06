const Chat = require('../models/chat');

exports.getChatHistory = async (req, res) => {
  try {
    const chats = await Chat.find({ username: req.params.username }).sort({ timestamp: -1 });
    res.json({ chats });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil riwayat chat.' });
  }
};

exports.saveChat = async (req, res) => {
  const { sessionId, username, conversation } = req.body;
  try {
    let chat = await Chat.findOne({ sessionId });
    if (!chat) {
      chat = new Chat({ sessionId, username, conversation });
    } else {
      chat.conversation = conversation;
      chat.timestamp = new Date();
    }
    await chat.save();
    res.json({ sessionId: chat.sessionId });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menyimpan chat.' });
  }
};

exports.deleteSession = async (req, res) => {
  try {
    const result = await Chat.deleteOne({ sessionId: req.params.sessionId });
    if (result.deletedCount === 0)
      return res.status(404).json({ error: 'Session tidak ditemukan' });
    res.json({ message: 'Session dihapus' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus session.' });
  }
};

exports.deleteAllChat = async (req, res) => {
  try {
    await Chat.deleteMany({ username: req.params.username });
    res.json({ message: 'Semua riwayat dihapus' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus riwayat.' });
  }
};