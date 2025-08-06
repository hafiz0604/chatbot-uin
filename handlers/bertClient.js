const axios = require('axios');

async function askBert(question, context) {
  try {
    const res = await axios.post('http://127.0.0.1:8000/answer', {
      question,
      context
    });
    return res.data.answer;
  } catch (err) {
    return null;
  }
}

module.exports = { askBert };