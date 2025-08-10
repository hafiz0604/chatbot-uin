const express = require('express');
const router = express.Router();
const askBert = require('../bertClient');
const fs = require('fs');
const path = require('path');

// Load data FAQ dan embedding yang baru (prosedur_akademik)
const faqTexts = JSON.parse(fs.readFileSync(path.join(__dirname, '../bert-api/prosedur_akademik_texts.json'), 'utf-8'));
// Embedding sekarang diproses di Python, similarity search dilakukan di backend Python agar hasil konsisten dengan model.
 
router.post('/qa', async (req, res) => {
  console.log('[QA DEBUG] req.body:', req.body);
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Pertanyaan tidak boleh kosong.' });
    }

    // Ambil context dari backend bert_api.py
    const bertResult = await askBert(question, "");
    // Defensive: pastikan bertResult object dan ada .answer
    let jawaban = "";
    let score = null;
    let bab = "";
    if (bertResult && typeof bertResult === "object") {
      jawaban = bertResult.answer || "";
      score = bertResult.score;
      bab = bertResult.bab || "";
    } else if (typeof bertResult === "string") {
      jawaban = bertResult;
    }

    if (!jawaban || jawaban.length < 5) {
      jawaban = "Maaf, tidak ditemukan jawaban relevan.";
    }

    return res.json({
      jawaban,
      score: score,
      bab: bab,
    });
  } catch (err) {
    console.error('[QA ERROR]', err.message, err.response?.data, err.stack);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});
module.exports = router;