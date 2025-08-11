const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const URL_BASE = process.env.BASE_URL

// Rate limiter: max 20 request per menit per IP
const dialogflowLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: 'Terlalu sering request. Coba lagi nanti.' }
});

router.post('/', dialogflowLimiter, async (req, res) => {
  const payload = req.body;

  // Validasi basic payload (ubah sesuai kebutuhan Dialogflow kamu)
  if (!payload || typeof payload !== 'object' || !payload.sessionId) {
    return res.status(400).json({ error: 'Payload tidak valid.' });
  }

  try {
    const response = await axios.post(`${URL_BASE}/api/dialogflow/webhook`, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

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