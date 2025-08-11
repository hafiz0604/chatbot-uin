const axios = require('axios');

const API_BASE = process.env.BASE_API;
const NIP = process.env.SIA_NIP;
const PASSWORD = process.env.SIA_PASSWORD;

let cachedToken = null;
let tokenExpire = 0;
async function getToken() {
  const now = Date.now();
  if (cachedToken && tokenExpire > now) return cachedToken;
  try {
    const response = await axios.post(`${API_BASE}/getToken`, {
      nip: NIP,
      password: PASSWORD
    });
    cachedToken = response.data.token;
    tokenExpire = now + (50 * 60 * 1000); // 50 menit
    return cachedToken;
  } catch (err) {
    throw new Error("Gagal mengambil token SIA.");
  }
}

async function getBeasiswaList(token) {
  try {
    const res = await axios.post(
      `${API_BASE}/beasiswa/getBeasiswa`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return Array.isArray(res.data.data) ? res.data.data : [];
  } catch (err) {
    throw new Error("Gagal mengambil data beasiswa dari SIA.");
  }
}

async function getBeasiswaDetail(token, namaBeasiswa) {
  try {
    const res = await axios.post(
      `${API_BASE}/beasiswa/getBeasiswa`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const list = Array.isArray(res.data.data) ? res.data.data : [];
    const found = list.find(b =>
      (b.NAMA_BEASISWA || '').toLowerCase().includes(namaBeasiswa) ||
      (b.NM_BEASISWA || '').toLowerCase().includes(namaBeasiswa) ||
      (b.nama_beasiswa || '').toLowerCase().includes(namaBeasiswa)
    );
    return found || null;
  } catch (err) {
    return null;
  }
}

function extractNamaBeasiswa(msg) {
  let text = (msg || '').toLowerCase();
  text = text.replace(/\b(informasi|info|tentang|detail|beasiswa|tahun|terbaru|syarat|cara daftar|prosedur|jadwal)\b/gi, '');
  text = text.replace(/[^\w\s]/gi, ''); // hilangkan tanda baca
  text = text.trim();
  return text;
}

function findBeasiswaDetail(list, query, rawMsg) {
  const q = (query || '').toLowerCase();
  // Coba match yang lebih robust, cek seluruh string di setiap properti
  return list.find(b => {
    const allNames = [
      b.NAMA_BEASISWA, b.NM_BEASISWA, b.nama_beasiswa, b.PEMBERI_BEASISWA
    ].filter(Boolean).map(str => str.toLowerCase());
    return allNames.some(n => n.includes(q)) || allNames.some(n => (rawMsg || '').toLowerCase().includes(n));
  });
}

function isGeneralBeasiswaQuery(msg) {
  if (!msg) return false;
  const lower = msg.toLowerCase();
  // Jika mengandung kata 'terbaru' atau hanya 'beasiswa', tanpa nama spesifik
  return (
    lower.includes('terbaru') ||
    (
      lower.includes('beasiswa') &&
      !lower.match(/baznas|kip|pln|inspirasi|cendekia|scholarship|nama|cahaya|bsi|kip kuliah|ybm/i)
    )
  );
}

function cleanHtml(html) {
  return (html || '').replace(/<[^>]*>?/gm, '').replace(/\n/g, ' ').trim();
}

// Tambahan: deteksi permintaan SYARAT, CARA DAFTAR, atau JADWAL
function detectDetailType(msg) {
  const text = msg.toLowerCase();
  if (text.includes('syarat')) return 'syarat';
  if (text.includes('cara daftar') || text.includes('prosedur')) return 'cara_daftar';
  if (text.includes('jadwal')) return 'jadwal';
  return null;
}

async function handleInformasiBeasiswa({ message, parameters, token: userToken, context }) {
  const userMessage = (message || "").trim();

  let token = userToken;
  if (!token) {
    try {
      token = await getToken();
    } catch (e) {
      return "Maaf, terjadi kesalahan saat mengambil token SIA.";
    }
  }

  let beasiswaList = [];
  try {
    beasiswaList = await getBeasiswaList(token);
  } catch (e) {
    return "Maaf, terjadi kesalahan saat mengambil data beasiswa dari SIA.";
  }
  if (!Array.isArray(beasiswaList) || beasiswaList.length === 0) {
    return "Maaf, data beasiswa belum tersedia.";
  }

  // ==== LOGIKA BARU: Jika pertanyaan umum, tampilkan daftar ====
  if (isGeneralBeasiswaQuery(userMessage)) {
    const daftar = beasiswaList.slice(0, 5).map((b, i) =>
      `${i + 1}. ${b.NAMA_BEASISWA || b.NM_BEASISWA || b.nama_beasiswa || 'Tanpa Nama'} (${b.PEMBERI_BEASISWA || '-'})`
    ).join('\n');
    return `Berikut beasiswa yang tersedia:\n${daftar}`;
  }

  // ==== Kalau query spesifik, tampilkan detail SYARAT/CARA DAFTAR/JADWAL ====
  const detailType = detectDetailType(userMessage);
  const namaEkstrak = extractNamaBeasiswa(userMessage);
  const beaDetail = findBeasiswaDetail(beasiswaList, namaEkstrak, userMessage);

  if (beaDetail && detailType) {
    let detail = '';
    if (detailType === 'syarat' && beaDetail.SYARAT) detail = cleanHtml(beaDetail.SYARAT);
    else if (detailType === 'syarat' && beaDetail.PENGUMUMAN) detail = cleanHtml(beaDetail.PENGUMUMAN);
    else if (detailType === 'syarat' && beaDetail.DESKRIPSI) detail = cleanHtml(beaDetail.DESKRIPSI);
    if (detailType === 'cara_daftar' && beaDetail.CARA_DAFTAR) detail = cleanHtml(beaDetail.CARA_DAFTAR);
    if (detailType === 'jadwal' && beaDetail.TGL_MULAI_PENDAFTARAN && beaDetail.TGL_AKHIR_PENDAFTARAN)
      detail = `Pendaftaran: ${beaDetail.TGL_MULAI_PENDAFTARAN} s/d ${beaDetail.TGL_AKHIR_PENDAFTARAN}`;

    if (detail) {
      let label = detailType === 'syarat' ? 'Syarat' : detailType === 'cara_daftar' ? 'Prosedur Pendaftaran' : 'Jadwal';
      return `Berikut ${label} Beasiswa ${beaDetail.NAMA_BEASISWA || beaDetail.NM_BEASISWA || beaDetail.nama_beasiswa}:\n${detail}`;
    } else {
      // PATCH: Jika pertanyaan spesifik, tapi detail kosong, JANGAN fallback ke daftar, langsung jawab tidak tersedia
      return "Maaf, informasi yang Anda minta belum tersedia.";
    }
  }

  // ==== Kalau query spesifik tapi tidak menanyakan SYARAT/CARA/JADWAL, tampilkan info umum ====
  if (beaDetail) {
    const nama = beaDetail.NAMA_BEASISWA || beaDetail.NM_BEASISWA || beaDetail.nama_beasiswa || "-";
    const pemberi = beaDetail.PEMBERI_BEASISWA || "-";
    const periode = (beaDetail.TGL_MULAI_BEASISWA && beaDetail.TGL_AKHIR_BEASISWA)
      ? `${beaDetail.TGL_MULAI_BEASISWA} s/d ${beaDetail.TGL_AKHIR_BEASISWA}`
      : "-";
    const pengumuman = cleanHtml(beaDetail.PENGUMUMAN) || "-";
    const pendaftaran = (beaDetail.TGL_MULAI_PENDAFTARAN && beaDetail.TGL_AKHIR_PENDAFTARAN)
      ? `${beaDetail.TGL_MULAI_PENDAFTARAN} s/d ${beaDetail.TGL_AKHIR_PENDAFTARAN}`
      : "-";
    return (
      `Informasi Beasiswa *${nama}*\n` +
      `Pemberi: ${pemberi}\n` +
      `Periode: ${periode}\n` +
      `Pendaftaran: ${pendaftaran}\n` +
      `Deskripsi/Syarat: ${pengumuman}`
    );
  }

  // PATCH: Jika query spesifik TIDAK KETEMU beasiswanya, langsung jawab tidak tersedia!
  return "Maaf, informasi yang Anda minta belum tersedia.";
}

module.exports = { handleInformasiBeasiswa };