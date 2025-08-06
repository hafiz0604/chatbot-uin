const express = require('express');
const axios = require('axios');
const router = express.Router();

// Handler relay agar payload ke webhook tetap utuh
router.post('/', async (req, res) => {
  const payload = req.body;
  try {
    const response = await axios.post('http://localhost:3000/api/dialogflow/webhook', payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    // PASTIKAN response.data ada field 'reply'
    // Jika tidak, tambahkan fallback di bawah:
    if (!response.data.reply && response.data.fulfillmentText) {
      res.json({ reply: response.data.fulfillmentText });
    } else {
      res.json(response.data);
    }
  } catch (e) {
    res.status(500).json({ reply: 'Terjadi kesalahan saat menghubungi server.', details: e.message });
  }
});

module.exports = router;