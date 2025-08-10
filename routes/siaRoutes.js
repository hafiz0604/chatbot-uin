const express = require('express');
const axios = require('axios');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware'); // Tambah middleware JWT

// Konfigurasi user API Akademik dari env
const API_URL = "http://api.uin-suka.ac.id/akademik/v2";
const NIP = process.env.SIA_NIP;
const PASSWORD = process.env.SIA_PASSWORD;

// Fungsi ambil token (cache di RAM selama aktif, per 1 jam misal)
let cachedToken = null;
let tokenExpire = 0;
async function getToken() {
  const now = Date.now();
  if (cachedToken && tokenExpire > now) return cachedToken;
  try {
    const res = await axios.post(`${API_URL}/getToken`, { nip: NIP, password: PASSWORD });
    cachedToken = res.data.token;
    tokenExpire = now + 50 * 60 * 1000; // 50 menit (token berlaku 1 jam, aman)
    return cachedToken;
  } catch (e) {
    throw new Error("Gagal ambil token API Akademik");
  }
}

// Endpoint info mahasiswa
router.post('/mahasiswa', async (req, res) => {
  console.log("/mahasiswa BODY:", req.body);
  const { nim } = req.body;
  if (!nim) return res.status(400).json({ error: "NIM wajib diisi" });
  try {
    const token = await getToken();
    const resp = await axios.post(`${API_URL}/getMahasiswa/info`, new URLSearchParams({ nim }), {
      headers: { Authorization: `Bearer ${token}` }
    });
    res.json(resp.data);
  } catch (e) {
    res.status(500).json({ error: "Gagal ambil data mahasiswa", detail: e.message });
  }
});

// Endpoint prodi (optional: filter by kode prodi)
router.post('/prodi', async (req, res) => {
  console.log("/prodi BODY:", req.body);
  const { kd_prodi } = req.body;
  try {
    const token = await getToken();
    const body = kd_prodi ? new URLSearchParams({ data_search: `KD_PRODI = '${kd_prodi}'` }) : new URLSearchParams();
    const resp = await axios.post(`${API_URL}/getProdiFull`, body, {
      headers: { Authorization: `Bearer ${token}` }
    });
    res.json(resp.data);
  } catch (e) {
    res.status(500).json({ error: "Gagal ambil data prodi", detail: e.message });
  }
});

// Endpoint kelas (misal: semester, tahun ajaran, prodi)
router.post('/kelas', async (req, res) => {
  console.log("/kelas BODY:", req.body);
  const { kd_ta, kd_smt, kd_prodi } = req.body;
  if (!kd_ta || !kd_smt || !kd_prodi) {
    return res.status(400).json({ error: "kd_ta, kd_smt, dan kd_prodi wajib diisi" });
  }
  try {
    const token = await getToken();
    const body = new URLSearchParams({ data_search: `KD_TA = '${kd_ta}' and KD_SMT = '${kd_smt}' and KD_PRODI = '${kd_prodi}'` });
    const resp = await axios.post(`${API_URL}/getKelas`, body, {
      headers: { Authorization: `Bearer ${token}` }
    });
    res.json(resp.data);
  } catch (e) {
    res.status(500).json({ error: "Gagal ambil data kelas", detail: e.message });
  }
});

// Endpoint berita (opsional: id_berita)
router.post('/berita', async (req, res) => {
  console.log("/berita BODY:", req.body);
  const { id_berita } = req.body;
  try {
    const token = await getToken();
    const body = id_berita ? new URLSearchParams({ data_search: `ID_BERITA = '${id_berita}'` }) : new URLSearchParams();
    const resp = await axios.post(`${API_URL}/berita/getBerita`, body, {
      headers: { Authorization: `Bearer ${token}` }
    });
    res.json(resp.data);
  } catch (e) {
    res.status(500).json({ error: "Gagal ambil berita", detail: e.message });
  }
});

// Endpoint beasiswa
router.post('/beasiswa', async (req, res) => {
  console.log("/beasiswa BODY:", req.body);
  const { kd_beasiswa } = req.body;
  try {
    const token = await getToken();
    const body = kd_beasiswa ? new URLSearchParams({ data_search: `a.KD_BEASISWA = '${kd_beasiswa}'` }) : new URLSearchParams();
    const resp = await axios.post(`${API_URL}/beasiswa/getBeasiswa`, body, {
      headers: { Authorization: `Bearer ${token}` }
    });
    res.json(resp.data);
  } catch (e) {
    res.status(500).json({ error: "Gagal ambil data beasiswa", detail: e.message });
  }
});

module.exports = router;