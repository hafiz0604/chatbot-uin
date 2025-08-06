const axios = require('axios');

async function askBert(question, context) {
  try {
      const res = await fetch('https://backendmu-production.up.railway.app/answer', {...})
      question,
      context
    });
    return res.data.answer;
  } catch (err) {
    return null;
  }
}

module.exports = { askBert };
