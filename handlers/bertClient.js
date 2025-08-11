// const axios = require('axios');
// const URL_BASE = process.env.BASE_URL_1

// /**
//  * Fungsi untuk request ke BERT API
//  * @param {string} question - pertanyaan user
//  * @param {string} context - konteks tambahan (opsional)
//  * @returns {string|null} - jawaban dari BERT atau null jika gagal
//  */
// async function askBert(question, context) {
//   try {
//     const res = await axios.post(`${URL_BASE}/answer`, {
//       question,
//       context
//     }, {
//       timeout: 10000 // timeout 10 detik
//     });
//     return res.data.answer;
//   } catch (err) {
//     // Log error hanya di backend, jangan expose ke user
//     console.error("ERROR Bert API:", err?.message || err);
//     return null;
//   }
// }

// module.exports = { askBert };