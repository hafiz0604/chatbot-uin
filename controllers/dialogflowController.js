const dialogflow = require('@google-cloud/dialogflow');
const path = require('path');

const projectId = process.env.DIALOGFLOW_PROJECT_ID;
const keyFilename = process.env.DIALOGFLOW_KEY_PATH || path.join(__dirname, '../credentials/dialogflow-key.json');
const sessionClient = new dialogflow.SessionsClient({ keyFilename });

// (Opsional) middleware JWT
// const { authenticateToken } = require('../middlewares/authMiddleware');
// router.post('/ask', authenticateToken, async (req, res) => {...})

exports.askDialogflow = async (req, res) => {
  const { message, sessionId } = req.body;
  if (!message || !sessionId) {
    return res.status(400).json({ error: 'message dan sessionId wajib diisi.' });
  }
  // (Opsional) cek token JWT dari req.user

  const sessionPath = sessionClient.sessionPath(projectId, sessionId);

  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: message,
        languageCode: 'id', // ganti ke 'en' jika Dialogflow kamu pakai English
      },
    },
  };

  try {
    const responses = await sessionClient.detectIntent(request);
    const result = responses[0].queryResult;
    res.json({
      reply: result.fulfillmentText,
      intent: result.intent.displayName,
      confidence: result.intentDetectionConfidence
    });
  } catch (err) {
    console.error('Dialogflow error:', err);
    res.status(500).json({ error: 'Dialogflow API error.' });
  }

};