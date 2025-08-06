const express = require('express');
const axios = require('axios');
const router = express.Router();

// Import handler modular
const { handleInformasiAkademik } = require('../handlers/prodiHandler');
const { handleInformasiBeasiswa } = require('../handlers/beasiswaHandler');
const { handleJadwalKuliah } = require('../handlers/jadwalKuliahHandler');
const { handleJadwalUjian } = require('../handlers/jadwalUjianHandler');
const { handlePengumumanKampus } = require('../handlers/pengumumanHandler');

// Konfigurasi API SIA
const API_URL = "http://api.uin-suka.ac.id/akademik/v2";
const NIP = "ACC.API.CHAT";
const PASSWORD = "0274512474";

// Token cache
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

// Helper ekstrak tahun ajaran, semester, hari
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

// Handler webhook menerima payload dari frontend
router.post('/webhook', async (req, res) => {
  const body = req.body;

  // Payload dari frontend
  const message = body.message;
  const sessionId = body.sessionId;
  const nim = body.nim;
  const token =
    body.originalDetectIntentRequest?.payload?.token ||
    body.token ||
    await getToken();

  // Logging debug
  console.log("Token dari payload:", body.originalDetectIntentRequest?.payload?.token);
  console.log("Token dari body:", body.token);
  console.log("Seluruh body:", body);

  // --- Intent detection manual ---
  let normalizedIntent = "";
  if (body.intent) {
    normalizedIntent = body.intent.trim().replace(/\s+/g, " ").toLowerCase();
  } else if (message) {
    if (message.toLowerCase().includes("jadwal")) {
      normalizedIntent = "informasi jadwal kuliah";
    } else if (message.toLowerCase().includes("beasiswa")) {
      normalizedIntent = "informasi beasiswa";
    } else if (message.toLowerCase().includes("akademik")) {
      normalizedIntent = "informasi akademik";
    } else if (message.toLowerCase().includes("ujian")) {
      normalizedIntent = "jadwal ujian";
    } else if (message.toLowerCase().includes("pengumuman")) {
      normalizedIntent = "pengumuman kampus";
    } else {
      normalizedIntent = "default fallback intent";
    }
  }

  let fulfillmentText = "Maaf, saya belum bisa membantu untuk permintaan ini.";

  try {
    if (!token) {
      return res.json({
        fulfillmentText: "Token autentikasi tidak ditemukan. Silakan login ulang.",
        intent: normalizedIntent,
      });
    }
    // Handler routing sesuai intent
    if (normalizedIntent === "default welcome intent") {
      fulfillmentText = "Halo! Saya Chatbot Akademik UIN SuKa. Ada yang bisa saya bantu?";
    } else if (normalizedIntent === "default fallback intent") {
      fulfillmentText = "Maaf, saya tidak memahami pertanyaan Anda.";
    } else if (normalizedIntent === "informasi akademik") {
      fulfillmentText = await handleInformasiAkademik({
        message,
        token,
        nim
      });
    } else if (normalizedIntent === "informasi beasiswa") {
      fulfillmentText = await handleInformasiBeasiswa({
        message,
        token
      });
    } else if (normalizedIntent === "informasi jadwal kuliah") {
      fulfillmentText = await handleJadwalKuliah({
        message,
        parameters: body.parameters || {},
        token,
        kd_prodi: body.kd_prodi,
        nim: body.nim,
        getTahunAjaranFromText,
        getSemesterFromText,
        getHariFromText
      });
    } else if (normalizedIntent === "jadwal ujian") {
      fulfillmentText = await handleJadwalUjian({
        message,
        token,
        kd_prodi: body.kd_prodi,
        getTahunAjaranFromText,
        getSemesterFromText
      });
    } else if (normalizedIntent === "pengumuman kampus") {
      fulfillmentText = await handlePengumumanKampus({ token });
    } else {
      fulfillmentText = "Intent tidak dikenali atau belum diimplementasikan.";
    }

    // PATCH: fallback jika intent tidak dikenali tapi ada kata kunci jadwal/kelas/hari
    if (
      (!fulfillmentText || fulfillmentText === "Maaf, saya tidak memahami pertanyaan Anda." || fulfillmentText === "Intent tidak dikenali atau belum diimplementasikan.") &&
      /jadwal|kelas|hari/i.test(message)
    ) {
      // Panggil handler jadwal kuliah
      fulfillmentText = await handleJadwalKuliah({
        message,
        parameters: body.parameters || {},
        token,
        kd_prodi: body.kd_prodi,
        nim: body.nim,
        getTahunAjaranFromText,
        getSemesterFromText,
        getHariFromText
      });
    }

    res.json({ reply: fulfillmentText, intent: normalizedIntent });
  } catch (err) {
    console.error('[Webhook Error]', err.stack || err);
    res.json({ reply: "Terjadi kesalahan pada server.", intent: normalizedIntent });
  }
});

module.exports = router;