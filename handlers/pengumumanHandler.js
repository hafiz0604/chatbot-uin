const axios = require('axios');
const API_URL = "http://api.uin-suka.ac.id/akademik/v2";

/**
 * Handler pengumuman kampus
 * @param {object} args - { token }
 */
async function handlePengumumanKampus({ token }) {
  if (!token) return "Token autentikasi tidak ditemukan. Silakan login ulang.";
  const resp = await axios.post(`${API_URL}/berita/getBerita`, new URLSearchParams(), {
    headers: { Authorization: `Bearer ${token}` }
  });
  const berita = resp.data?.data?.[0];
  return berita
    ? `Pengumuman Kampus: ${berita.JUDUL}\n${berita.ISI}`
    : "Tidak ada pengumuman kampus yang ditemukan.";
}

module.exports = { handlePengumumanKampus };