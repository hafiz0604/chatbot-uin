const axios = require('axios');
const URL_BASE = process.env.BASE_URL_BERT

async function askBert(question, context) {
  console.log("Making request to:", `${URL_BASE}/answer`);
  try {
    const response = await axios.post(`${URL_BASE}/answer`, 
      { question, context },
      { timeout: 30000 }
    );
    console.log("Response received:", response.status);
    return response.data;
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.error('[BERT CLIENT ERROR] Connection refused. Is the API server running?');
    } else if (err.code === 'ETIMEDOUT') {
      console.error('[BERT CLIENT ERROR] Request timed out. API server might be overloaded.');
    } else {
      console.error('[BERT CLIENT ERROR]', err.message, err.response?.data, err.stack);
    }
    throw err;
  }
}

module.exports = askBert;