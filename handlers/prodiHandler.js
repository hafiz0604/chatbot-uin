const axios = require('axios');
const API_URL = "http://api.uin-suka.ac.id/akademik/v2";

async function handleInformasiAkademik({ message, token, nim }) {
  console.log('==== HANDLER FULFILLMENT DIPANGGIL ====');
  console.log('[message]', message);
  console.log('[token]', token);
  console.log('[nim]', nim);

  const queryText = (message || "").toLowerCase().trim();
  if (!token) return "Token autentikasi tidak ditemukan. Silakan login ulang.";
  if (!nim) return "NIM tidak tersedia. Silakan login ulang.";

  try {
    // Ambil data mahasiswa satu kali saja
    const resp = await axios.post(
      `${API_URL}/getMahasiswa/info`,
      new URLSearchParams({ nim }),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const mhs = resp.data?.data;

    if (!mhs) return "Data mahasiswa tidak ditemukan.";

    // Routing sub-info
    if (/dosen pa|dosen pembimbing/.test(queryText)) {
      if (mhs.NM_DPA) return `Dosen PA Anda: ${mhs.NM_DPA}\nNIP: ${mhs.NIP_DPA || '-'}`;
      return "Data dosen PA tidak ditemukan.";
    }
    if (/status mahasiswa|status kuliah/.test(queryText)) {
      if (mhs.STATUS_MHS) return `Status mahasiswa Anda: ${mhs.STATUS_MHS}`;
      return "Status mahasiswa tidak ditemukan.";
    }
    if (/angkatan/.test(queryText)) {
      if (mhs.ANGKATAN) return `Angkatan Anda: ${mhs.ANGKATAN}`;
      return "Data angkatan tidak ditemukan.";
    }
    if (/prodi|program studi/.test(queryText)) {
      if (mhs.NM_PRODI) return `Program studi Anda: ${mhs.NM_PRODI}`;
      return "Data program studi tidak ditemukan.";
    }
    if (/nim|nomor induk/.test(queryText)) {
      if (nim) return `NIM Anda: ${nim}`;
      return "NIM tidak ditemukan.";
    }
    if (/kelas/.test(queryText)) {
      if (mhs.KELAS) return `Kelas Anda: ${mhs.KELAS}`;
      return "Data kelas tidak ditemukan.";
    }
    if (/jenjang/.test(queryText)) {
      if (mhs.JENJANG) return `Jenjang pendidikan Anda: ${mhs.JENJANG}`;
      return "Data jenjang tidak ditemukan.";
    }
    // Jika pertanyaan umum/semua info
    if (/data ?diri|profil|info saya/.test(queryText)) {
      return (
        `Profil Mahasiswa:\n` +
        `Nama: ${mhs.NAMA || '-'}\n` +
        `NIM: ${nim}\n` +
        `Prodi: ${mhs.NM_PRODI || '-'}\n` +
        `Angkatan: ${mhs.ANGKATAN || '-'}\n` +
        `Dosen PA: ${mhs.NM_DPA || '-'}\n` +
        `NIP DPA: ${mhs.NIP_DPA || '-'}\n` +
        `Status: ${mhs.STATUS_MHS || '-'}`
      );
    }
    // Fallback info
    return "Silakan tanyakan tentang profil, status, prodi, dosen PA, angkatan, kelas, jenjang, atau NIM Anda.";
  } catch (e) {
    console.error('[prodiHandler] ERROR getMahasiswa/info:', e.response?.data || e.message);
    return "Gagal mengambil data mahasiswa dari SIA.";
  }
}

module.exports = { handleInformasiAkademik };