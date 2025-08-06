const axios = require('axios');
const API_URL = "http://api.uin-suka.ac.id/akademik/v2";

/**
 * Handler informasi program studi & mahasiswa
 * @param {object} args - { message, parameters, token, nim }
 */
async function handleInformasiAkademik({ message, parameters, token, nim }) {
  const jenis = (parameters.jenis_informasi || "").toLowerCase();

  if (!token) return "Token autentikasi tidak ditemukan. Silakan login ulang.";

  // Info Prodi
  if (/prodi|program studi/.test(jenis)) {
    try {
      const resp = await axios.post(`${API_URL}/getProdiFull`, new URLSearchParams(), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = resp.data?.data;
      if (data && data.length > 0) {
        return "Berikut daftar program studi di UIN Sunan Kalijaga:\n- " +
          data.map(p => p.NM_PRODI).join('\n- ');
      } else {
        return "Data program studi tidak ditemukan.";
      }
    } catch (e) {
      return "Gagal mengambil data program studi dari SIA.";
    }
  }

  // Info Mahasiswa by NIM
  const nim_mhs = parameters.nim || parameters.NIM || nim;
  if (jenis === "mahasiswa" && nim_mhs) {
    try {
      const resp = await axios.post(`${API_URL}/getMahasiswa/info`, new URLSearchParams({ nim: nim_mhs }), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const mhs = resp.data?.data?.[0];
      return mhs
        ? `Nama: ${mhs.NAMA}\nNIM: ${mhs.NIM}\nProdi: ${mhs.NM_PRODI}\nStatus: ${mhs.STATUS_MHS}`
        : "Data mahasiswa tidak ditemukan.";
    } catch (e) {
      return "Gagal mengambil data mahasiswa dari SIA.";
    }
  }

  // Fallback
  return "Informasi akademik yang dimaksud belum didukung. Silakan tanyakan tentang prodi atau mahasiswa.";
}

module.exports = { handleInformasiAkademik };