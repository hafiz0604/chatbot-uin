const express = require('express');
const axios = require('axios');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware'); // opsional jika ingin aman

// Import handler modular
const { handleInformasiAkademik } = require('../handlers/prodiHandler');
const { handleInformasiBeasiswa } = require('../handlers/beasiswaHandler');
const { handleJadwalKuliah } = require('../handlers/jadwalKuliahHandler');
const { handleJadwalUjian } = require('../handlers/jadwalUjianHandler');
const { handlePengumumanKampus } = require('../handlers/pengumumanHandler');
const URL_BASE = process.env.BASE_URL

// Konfigurasi API SIA
const API_URL = process.env.BASE_API;
const NIP = process.env.SIA_NIP;
const PASSWORD = process.env.SIA_PASSWORD;

// Token cache
let cachedToken = null;
let tokenExpire = 0;
async function getToken() {
  const now = Date.now();
  if (cachedToken && tokenExpire > now) return cachedToken;
  try {
    const res = await axios.post(`${API_URL}/getToken`, {
      nip: NIP,
      password: PASSWORD
    });
    // Ambil token dari res.data.data.token
    if (res.data && res.data.data && res.data.data.token) {
      cachedToken = res.data.data.token;
      tokenExpire = now + 50 * 60 * 1000;
      return cachedToken;
    } else {
      console.error("Token tidak ditemukan di response:", res.data);
      return null;
    }
  } catch (err) {
    console.error("Gagal mendapatkan token SIA:", err.message, err.response?.data);
    return null;
  }
}

// Helper ekstrak tahun ajaran, semester, hari
function getTahunAjaranFromText(text) {
  const match = text && text.match(/\b(20\d{2})(?:\/20\d{2})?\b/);
  return match ? match[1] : null;
}
function getSemesterFromText(text) {
  const match = text && (text.match(/\bsemester\s*(\d+)\b/i) || text.match(/\bsmt\s*(\d+)\b/i));
  return match ? match[1] : null;
}
function getHariFromText(text) {
  const hariList = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];
  text = (text || '').toLowerCase();
  for (const h of hariList) {
    if (text.includes(h)) return h;
  }
  return null;
}
function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
}

// Fungsi deteksi pertanyaan profil/status
function isPertanyaanProfil(msg) {
  return msg && msg.match(/data ?diri|profil|info saya|status mahasiswa|status kuliah|dosen pa|dosen pembimbing|prodi|program studi|angkatan|kelas|jenjang|nim|nomor induk/i);
}

// Fungsi deteksi sapaan/salam
function isSapaan(msg) {
  if (!msg) return false;
  return /^(halo|hai|hello|hi|assalamualaikum|selamat (siang|pagi|malam|sore))\b/i.test(msg.trim());
}

// Handler webhook menerima payload dari frontend
router.post('/', async (req, res) => {
  const body = req.body;

  // Payload dari frontend
  const message = body.message;
  const sessionId = body.sessionId;
  const nim = body.nim;
  const token =
    body.originalDetectIntentRequest?.payload?.token ||
    body.token ||
    await getToken();

  // Logging debug (non-production)
  if (process.env.NODE_ENV !== 'production') {
    console.log("Token dari payload:", body.originalDetectIntentRequest?.payload?.token);
    console.log("Token dari body:", body.token);
    console.log("Seluruh body:", body);
  }

  // --- Intent detection manual ---
  let normalizedIntent = "";
  if (body.intent) {
    normalizedIntent = body.intent.trim().replace(/\s+/g, " ").toLowerCase();
  } else if (message) {
    const msg = message.toLowerCase();
    if (
      msg.match(/\b(dosen pa|dosen pembimbing|status mahasiswa|status kuliah|angkatan saya|prodi saya|program studi saya|nim saya|kelas saya|jenjang saya|data ?diri|profil|info saya|nomor induk)\b/i)
    ) {
      normalizedIntent = "informasi akademik";
    } else if (msg.includes("ujian") || msg.includes("uas")) {
      normalizedIntent = "jadwal ujian";
    } else if (msg.includes("jadwal")) {
      normalizedIntent = "informasi jadwal kuliah";
    } else if (msg.includes("beasiswa")) {
      normalizedIntent = "informasi beasiswa";
    } else if (msg.includes("akademik")) {
      normalizedIntent = "informasi akademik";
    } else if (msg.includes("pengumuman")) {
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

    // ======== PATCH: ROUTING SAPAAN LANGSUNG KE DIALOGFLOW (WELCOME) =========
    if (isSapaan(message)) {
      // Jika ingin, bisa juga request ke Dialogflow API, tapi default saja:
      return res.json({
        reply: "Halo! Ada yang bisa saya bantu seputar akademik UIN SuKa?",
        intent: "Default Welcome Intent"
      });
    }
    // ==========================================================================

    // PATCH: Routing ke QA dokumen pedoman akademik
    // Jika pertanyaan BUKAN profil/status/prodi/kelas/angkatan/dosen PA/NIM, langsung ke QA dokumen
    if (!isPertanyaanProfil(message)
      && normalizedIntent !== "informasi beasiswa"
      && normalizedIntent !== "informasi jadwal kuliah"
      && normalizedIntent !== "jadwal ujian"
      && normalizedIntent !== "pengumuman kampus"
    ) {
      // Routing ke QA dokumen (bert/FastAPI)
      if (process.env.NODE_ENV !== 'production') {
        console.log('Body sebelum QA:', req.body);
      }
      try {
        // PENTING: pastikan field-nya "question", bukan "message"
        const qaResp = await axios.post(`${URL_BASE}/api/qa`, { question: message });
        if (process.env.NODE_ENV !== 'production') {
          console.log('Jawaban dari QA:', qaResp.data);
        }
        if (qaResp.data && qaResp.data.jawaban) {
          return res.json({ reply: qaResp.data.jawaban, intent: "qa_pedoman", score: qaResp.data.score, bab: qaResp.data.bab });
        } else {
          return res.json({ reply: "Maaf, saya tidak menemukan jawaban di dokumen.", intent: "qa_pedoman" });
        }
      } catch (err) {
        console.error('Error QA dokumen:', err.message, err.response?.data, err.stack);
        return res.json({ reply: "Maaf, terjadi kesalahan saat menjawab pertanyaan akademik.", intent: "qa_pedoman" });
      }
    }

    // === LOGIC LAMA MASIH BERJALAN UNTUK INTENT LAIN ===
    if (normalizedIntent === "informasi akademik") {
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
      normalizedIntent !== "jadwal ujian" &&
      (
        !fulfillmentText ||
        fulfillmentText === "Maaf, saya tidak memahami pertanyaan Anda." ||
        fulfillmentText === "Intent tidak dikenali atau belum diimplementasikan."
      ) &&
      /jadwal|kelas|hari/i.test(message)
    ) {
      if (process.env.NODE_ENV !== 'production') console.log("=== PATCH FALLBACK JALAN (KE KULIAH)===");
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