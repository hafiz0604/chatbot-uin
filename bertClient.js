const axios = require('axios');

async function askBert(question, context) {
  try {
    const response = await axios.post('http://localhost:8000/answer', { question, context });
    return response.data;
  } catch (err) {
    console.error('[BERT CLIENT ERROR]', err.message, err.response?.data, err.stack);
    throw err;
  }
}

module.exports = askBert;