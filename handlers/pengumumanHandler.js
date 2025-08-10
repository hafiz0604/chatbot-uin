const axios = require('axios');
const API_URL = "http://api.uin-suka.ac.id/akademik/v2";

// Cache di-memory (selama proses Node.js hidup)
let pengumumanCache = {
  data: null,
  timestamp: 0
};

async function handlePengumumanKampus({ token }) {
  const CACHE_TIME = 5 * 60 * 1000; // 5 menit dalam ms
  const now = Date.now();

  // Jika cache masih valid, balas pakai cache
  if (pengumumanCache.data && (now - pengumumanCache.timestamp < CACHE_TIME)) {
    return pengumumanCache.data + "\n\n*Data ini dari cache karena server pengumuman lambat atau sering sama.*";
  }

  try {
    const resp = await axios.post(`${API_URL}/berita/getBerita`, new URLSearchParams(), {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 5000 // 5 detik
    });
    let beritaList = resp.data?.data || [];

    // Urutkan berdasarkan tanggal jika field ada
    if (beritaList.length > 0 && beritaList[0].TGL_POST) {
      beritaList.sort((a, b) => new Date(b.TGL_POST) - new Date(a.TGL_POST));
    }

    let output;
    if (beritaList.length > 0) {
      output = "Pengumuman terbaru tidak tersedia. Berikut pengumuman terakhir yang ada di sistem:\n\n" +
        beritaList.slice(0, 3).map((berita, i) =>
          `${i + 1}. ${berita.JUDUL || "-"}\nTanggal: ${berita.TGL_POST || "-"}\nRingkasan: ${berita.ISI ? berita.ISI.slice(0, 200) + (berita.ISI.length > 200 ? "..." : "") : "-"}`
        ).join('\n---\n');
    } else {
      output = "Tidak ada pengumuman kampus yang ditemukan.";
    }

    // Simpan hasil ke cache
    pengumumanCache.data = output;
    pengumumanCache.timestamp = now;

    return output;
  } catch (error) {
    if (pengumumanCache.data) {
      // Kalau error dan ada cache, balas dari cache
      return pengumumanCache.data + "\n\n*Ini pengumuman terakhir yang berhasil diambil karena server sedang sibuk atau error.*";
    }
    if (error.code === 'ECONNABORTED') {
      return "Server pengumuman kampus sedang sibuk/tidak merespons. Silakan coba beberapa saat lagi.";
    }
    console.error('[handlePengumumanKampus]', error.message, error.response?.data);
    return "Terjadi kesalahan saat mengambil pengumuman kampus. Silakan coba lagi nanti.";
  }
}

module.exports = { handlePengumumanKampus };