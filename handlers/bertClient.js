const axios = require('axios');

/**
 * Fungsi untuk request ke BERT API
 * @param {string} question - pertanyaan user
 * @param {string} context - konteks tambahan (opsional)
 * @returns {string|null} - jawaban dari BERT atau null jika gagal
 */
async function askBert(question, context) {
  try {
    const res = await axios.post('http://127.0.0.1:8000/answer', {
      question,
      context
    }, {
      timeout: 10000 // timeout 10 detik
    });
    return res.data.answer;
  } catch (err) {
    // Log error hanya di backend, jangan expose ke user
    console.error("ERROR Bert API:", err?.message || err);
    return null;
  }
}

module.exports = { askBert };