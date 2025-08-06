const axios = require('axios');
const Fuse = require('fuse.js');
const API_URL = "http://api.uin-suka.ac.id/akademik/v2";

/**
 * Helper untuk ambil parameter dari Dialogflow
 */
function getParamField(parameters, name) {
  if (parameters?.fields && parameters.fields[name]) {
    if ('stringValue' in parameters.fields[name]) return parameters.fields[name].stringValue;
    if ('structValue' in parameters.fields[name]) return parameters.fields[name].structValue;
  }
  return parameters?.[name] || '';
}

/**
 * Deteksi pertanyaan umum beasiswa tanpa nama
 */
function isGeneralBeasiswaQuery(text) {
  return /(syarat|persyaratan|cara daftar|pendaftaran|info|informasi)[\s\S]*beasiswa/i.test(text);
}

/**
 * Handler utama informasi beasiswa
 * @param {object} args - { message, parameters, token, context }
 */
async function handleInformasiBeasiswa({ message, parameters, token, context }) {
  const userMessage = (message || "").toLowerCase();
  const namaBeasiswa = (getParamField(parameters, 'nama_beasiswa') || '').toLowerCase();

  if (!token) {
    return "Token autentikasi tidak ditemukan. Silakan login ulang.";
  }

  let beasiswaList = [];
  try {
    const resp = await axios.post(`${API_URL}/beasiswa/getBeasiswa`, new URLSearchParams(), {
      headers: { Authorization: `Bearer ${token}` }
    });
    beasiswaList = Array.isArray(resp.data?.data) ? resp.data.data : [];
    if (!beasiswaList.length) return "Data beasiswa tidak tersedia untuk saat ini.";
  } catch (e) {
    console.error("ERROR getBeasiswa:", e?.response?.data || e?.message || e);
    return "Terjadi kesalahan saat mengambil data beasiswa. Silakan coba beberapa saat lagi.";
  }

  // Jika user sebut nama beasiswa (atau sedang menjawab multi-turn)
  if (context === "menjawab_nama_beasiswa" || namaBeasiswa) {
    // Fuzzy search toleran typo
    const fuse = new Fuse(beasiswaList, {
      keys: ['NAMA_BEASISWA', 'NM_BEASISWA', 'nama_beasiswa'],
      threshold: 0.4
    });
    const searchTerm = namaBeasiswa || userMessage;
    const result = fuse.search(searchTerm);
    const bea = result.length ? result[0].item : null;

    if (bea) {
      return (
        `Informasi Beasiswa *${bea.NAMA_BEASISWA || bea.NM_BEASISWA || bea.nama_beasiswa}*\n` +
        `Periode: ${bea.PERIODE || bea.periode || '-'}\n` +
        `Syarat/Petunjuk: ${bea.KETERANGAN || bea.deskripsi || '-'}`
      );
    } else {
      // Tampilkan 5 daftar terdekat untuk membantu user memilih
      const daftar = beasiswaList.slice(0, 5).map((b, i) =>
        `${i + 1}. ${b.NAMA_BEASISWA || b.NM_BEASISWA || b.nama_beasiswa || 'Tanpa Nama'}`
      ).join('\n');
      return `Maaf, beasiswa dengan nama "${searchTerm}" tidak ditemukan.\nCek daftar beasiswa berikut:\n${daftar}`;
    }
  }

  // Jika user tanya syarat/cara daftar/info beasiswa tanpa sebut nama
  if (isGeneralBeasiswaQuery(userMessage)) {
    return "Beasiswa apa yang Anda maksud? Silakan sebutkan nama beasiswanya (misal: KIP Kuliah, BAZNAS, dsb).";
  }

  // Jika user hanya tanya "beasiswa" (tampilkan daftar)
  if (userMessage.includes('beasiswa')) {
    const daftar = beasiswaList.map((b, i) =>
      `${i + 1}. ${b.NAMA_BEASISWA || b.NM_BEASISWA || b.nama_beasiswa || 'Tanpa Nama'} (${b.PERIODE || b.periode || '-'})`
    ).join('\n');
    return "Berikut daftar beasiswa yang tersedia di UIN Sunan Kalijaga:\n" + daftar;
  }

  // Fallback
  return "Silakan tanyakan info, syarat, atau cara daftar beasiswa tertentu.";
}

module.exports = { handleInformasiBeasiswa };