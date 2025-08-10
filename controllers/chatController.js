const Chat = require('../models/chat');
const axios = require('axios');

exports.chatBotHandler = async (req, res) => {
  try {
    const { username, message, threadId } = req.body;
    if (!username || !message || !threadId) {
      return res.status(400).json({ error: "Semua field wajib diisi." });
    }

    // 1. Simpan pesan user
    const userMsg = new Chat({ username, message, sender: 'user', threadId });
    await userMsg.save();

    // 2. Kirim ke Dialogflow (via route kamu sendiri)
    // sessionId/parameter bisa gunakan threadId atau username
    let botReply = "Maaf, terjadi kesalahan koneksi ke Dialogflow.";
    try {
      const dialogflowRes = await axios.post('http://localhost:3000/api/dialogflow', {
        message: message,
        sessionId: threadId,
        nim: username // optional, jika perlu
      });
      // Balasan Dialogflow bisa di field .reply atau .fulfillmentText
      botReply = dialogflowRes.data.reply || dialogflowRes.data.fulfillmentText || botReply;
    } catch (dfErr) {
      console.error('[ERROR] Dialogflow API:', dfErr.message);
    }

    // 3. Simpan pesan bot
    const botMsg = new Chat({ username, message: botReply, sender: 'bot', threadId });
    await botMsg.save();

    // 4. Kembalikan balasan ke frontend
    res.json({
      response: botReply
    });
  } catch (err) {
    console.error(`[ERROR] chatBotHandler`, err);
    res.status(500).json({ error: 'Gagal memproses pesan bot.' });
  }
};

// Fungsi dummy untuk balasan bot (bisa ganti sesuai kebutuhan)
function generateBotReply(userMessage) {
  // Contoh: mode echo
  if (/halo|hai/i.test(userMessage)) return "Halo, ada yang bisa saya bantu?";
  return `Bot menerima: ${userMessage}`;
}

// Ambil semua threadId unik milik user
exports.getUserThreads = async (req, res) => {
  const { username } = req.params;
  try {
    const threads = await Chat.aggregate([
      { $match: { username } },
      {
        $group: {
          _id: "$threadId",
          lastMessage: { $last: "$message" },
          lastSender: { $last: "$sender" },
          lastAt: { $last: "$createdAt" }
        }
      },
      { $sort: { lastAt: -1 } }
    ]);
    res.json(threads);
  } catch (err) {
    console.error("[ERROR] getUserThreads", err);
    res.status(500).json({ error: 'Gagal mengambil threads.' });
  }
};

// Ambil semua pesan dalam thread tertentu (per message)
exports.getThreadMessages = async (req, res) => {
  // Safe logging
  const userLog = req.user && req.user.username ? req.user.username : 'anonymous';
  console.log(`[Controller] getThreadMessages user=${userLog} params=${JSON.stringify(req.params)} query=${JSON.stringify(req.query)}`);
  
  // Validasi user - dengan pengecekan keberadaan req.user
  if (!req.user) {
    console.warn(`[WARN] User tidak terautentikasi`);
    return res.status(401).json({ error: "Autentikasi diperlukan." });
  } 
  
  if (req.user.username !== req.params.username) {
    console.warn(`[WARN] Akses ditolak untuk ${req.user.username}`);
    return res.status(403).json({ error: "Akses ditolak." });
  }
  
  const { username } = req.params;
  const { threadId } = req.query;
  if (!threadId) {
    console.warn(`[WARN] threadId wajib diisi.`);
    return res.status(400).json({ error: "threadId wajib diisi." });
  }
  try {
    const chats = await Chat.find({ username, threadId }).sort({ createdAt: 1 });
    console.log(`[Controller] chats found:`, chats.length);
    res.json(chats);
  } catch (err) {
    console.error(`[ERROR] getThreadMessages`, err);
    res.status(500).json({ error: 'Gagal mengambil chat.' });
  }
};

// Juga perlu mengubah fungsi saveMessage dengan cara yang sama
exports.saveMessage = async (req, res) => {
  console.log(`[Controller] saveMessage body=`, req.body);
  const { username, message, sender, threadId } = req.body;
  if (!username || !message || !sender || !threadId) {
    console.warn(`[WARN] Semua field wajib diisi.`, req.body);
    return res.status(400).json({ error: "Semua field wajib diisi." });
  }
  
  // Validasi user - dengan pengecekan keberadaan req.user
  if (sender !== 'bot') {
    if (!req.user) {
      console.warn(`[WARN] User tidak terautentikasi`);
      return res.status(401).json({ error: "Autentikasi diperlukan." });
    }
    
    if (req.user.username !== username) {
      console.warn(`[WARN] Akses ditolak untuk ${req.user.username}`);
      return res.status(403).json({ error: "Akses ditolak." });
    }
  }
  
  try {
    const chat = new Chat({ username, message, sender, threadId });
    await chat.save();
    console.log(`[Controller] chat saved:`, chat);
    res.json(chat);
  } catch (err) {
    console.error(`[ERROR] saveMessage`, err);
    res.status(500).json({ error: 'Gagal menyimpan chat.' });
  }
};
// Hapus semua chat pada thread tertentu milik user
exports.deleteThread = async (req, res) => {
  // PATCH: Jangan akses req.user.username!
  // console.log(`[Controller] deleteThread user=${req.user.username} params=${JSON.stringify(req.params)}`); // debug

  const { username, threadId } = req.params;
  try {
    await Chat.deleteMany({ username, threadId });
    console.log(`[Controller] delete success`);
    res.json({ success: true });
  } catch (err) {
    console.error(`[ERROR] deleteThread`, err);
    res.status(500).json({ error: 'Gagal menghapus thread.' });
  }
};