const express = require('express');
const axios = require('axios');
const dialogflow = require('@google-cloud/dialogflow');
const path = require('path');
const router = express.Router();
const { askBert } = require('../handlers/bertClient'); 

// Import all handlers
const beasiswaHandler = require('../handlers/beasiswaHandler');
const jadwalKuliahHandler = require('../handlers/jadwalKuliahHandler');
const prodiHandler = require('../handlers/prodiHandler');
const jadwalUjianHandler = require('../handlers/jadwalUjianHandler');
const pengumumanHandler = require('../handlers/pengumumanHandler');

// Dialogflow config
const projectId = 'evocative-radar-460401-k0';
const keyFilename = path.join(__dirname, '../credentials/dialogflow-key.json');
const sessionClient = new dialogflow.SessionsClient({ keyFilename });

// SIA API config
const API_URL = "http://api.uin-suka.ac.id/akademik/v2";
const NIP = "ACC.API.CHAT";
const PASSWORD = "0274512474";
let cachedToken = null;
let tokenExpire = 0;
async function getToken() {
  const now = Date.now();
  if (cachedToken && tokenExpire > now) return cachedToken;
  const res = await axios.post(`${API_URL}/getToken`, { nip: NIP, password: PASSWORD });
  cachedToken = res.data.token;
  tokenExpire = now + 50 * 60 * 1000;
  return cachedToken;
}

// Helper functions
function getTahunAjaranFromText(text) {
  const match = text.match(/\b(20\d{2})(?:\/20\d{2})?\b/);
  return match ? match[1] : null;
}
function getSemesterFromText(text) {
  const match = text.match(/\bsemester\s*(\d+)\b/i) || text.match(/\bsmt\s*(\d+)\b/i);
  return match ? match[1] : null;
}
function getHariFromText(text) {
  const hariList = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];
  text = text.toLowerCase();
  for (const h of hariList) {
    if (text.includes(h)) return h;
  }
  return null;
}
function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
}
function getParamField(parameters, name) {
  if (parameters?.fields && parameters.fields[name]) {
    if ('stringValue' in parameters.fields[name]) {
      return parameters.fields[name].stringValue;
    }
    if ('structValue' in parameters.fields[name]) {
      return parameters.fields[name].structValue;
    }
  }
  return '';
}

router.post('/', async (req, res) => {
  const { message, sessionId, nim } = req.body;
  if (!message || !sessionId || !nim) {
    return res.status(400).json({ error: 'message, sessionId, dan nim wajib diisi.' });
  }

  const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

  try {
    // Dialogflow detectIntent
    const responses = await sessionClient.detectIntent({
      session: sessionPath,
      queryInput: {
        text: { text: message, languageCode: 'id' },
      },
    });
    const result = responses[0].queryResult;
    const intent = result.intent?.displayName || "";
    const parameters = result.parameters || {};
    let reply = result.fulfillmentText || "Maaf, data tidak ditemukan.";
    const token = await getToken();

    const normalizedIntent = intent.trim().replace(/\s+/g, " ").toLowerCase();

    // === Handler Mapping ===
    const handlers = {
      "informasi beasiswa": beasiswaHandler,
      "informasi jadwal kuliah": jadwalKuliahHandler,
      "jadwal kuliah hari": jadwalKuliahHandler,
      "jadwal kelas hari": jadwalKuliahHandler,
      "jadwal kuliah besok": jadwalKuliahHandler,
      "jadwal kelas besok": jadwalKuliahHandler,
      "informasi akademik": prodiHandler,
      "jadwal ujian": jadwalUjianHandler,
      "pengumuman kampus": pengumumanHandler
    };

    // === Default Welcome Intent ===
    if (normalizedIntent === "default welcome intent") {
      reply = "Halo! Saya Chatbot Akademik UIN Sunan Kalijaga. Ada yang bisa saya bantu?";
      return res.json({ reply, intent, confidence: result.intentDetectionConfidence, parameters });
    }

    // === Handler Execution ===
    const handler = handlers[normalizedIntent];
    if (handler) {
      try {
        let extraParams = {};
        // Special: Pass helper functions if needed
        if (handler === jadwalKuliahHandler || handler === jadwalUjianHandler) {
          let kd_prodi = parameters.kd_prodi;
          if (!kd_prodi && nim) {
            const resp = await axios.post(`${API_URL}/getMahasiswa/info`, new URLSearchParams({ nim }), {
              headers: { Authorization: `Bearer ${token}` }
            });
            kd_prodi = resp.data?.data?.[0]?.KD_PRODI || null;
          }
          extraParams = {
            getTahunAjaranFromText,
            getSemesterFromText,
            getHariFromText,
            capitalize,
            kd_prodi
          };
        }
        if (handler === prodiHandler) {
          extraParams.nim = nim;
        }
        reply = await handler({
          message, parameters, token, ...extraParams
        });
        return res.json({ reply, intent, confidence: result.intentDetectionConfidence, parameters });
      } catch (e) {
        return res.status(500).json({ error: 'Handler error', details: e.message });
      }
    }

    // === Fallback: BERT-based answer for Default Fallback Intent ===
    if (intent === 'Default Fallback Intent' || normalizedIntent === 'default fallback intent') {
      // Kamu bisa ambil context dari FAQ/dokumen, atau langsung string
      const context = 'Chatbot adalah program komputer yang dapat mensimulasikan percakapan dengan pengguna.';
      let answer = null;
      try {
        answer = await askBert(message, context);
      } catch (e) {
        // log error jika perlu
      }
      return res.json({
        reply: answer || "Maaf, saya belum bisa menjawab.",
        intent,
        confidence: result.intentDetectionConfidence,
        parameters
      });
    }

    // === Fallback global (jika intent tidak dikenali) ===
    reply = "Maaf, intent belum dikenali atau belum diimplementasikan.";
    return res.json({ reply, intent, confidence: result.intentDetectionConfidence, parameters });

  } catch (err) {
    console.error('[Dialogflow Error]', err.stack || err);
    res.status(500).json({ error: 'Dialogflow API error.', details: err.message });
  }
});

module.exports = router;