const axios = require('axios');
const API_URL = "http://api.uin-suka.ac.id/akademik/v2";

/**
 * Handler jadwal ujian
 * @param {object} args - { message, parameters, token, kd_prodi, getTahunAjaranFromText, getSemesterFromText }
 */
async function handleJadwalUjian({ message, parameters, token, kd_prodi, getTahunAjaranFromText, getSemesterFromText }) {
  const kd_ta = parameters.kd_ta || getTahunAjaranFromText(message);
  const kd_smt = parameters.kd_smt || getSemesterFromText(message);

  if (!token) return "Token autentikasi tidak ditemukan. Silakan login ulang.";
  if (!kd_ta || !kd_smt || !kd_prodi) {
    return "Mohon masukkan tahun ajaran (misal: 2025) dan semester (misal: 8), serta pastikan NIM Anda sudah terdaftar.";
  } else {
    const body = new URLSearchParams({ data_search: `KD_TA = '${kd_ta}' and KD_SMT = '${kd_smt}' and KD_PRODI = '${kd_prodi}'` });
    const resp = await axios.post(`${API_URL}/getJadwalUjian`, body, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const ujian = resp.data?.data?.[0];
    return ujian
      ? `Mata Kuliah: ${ujian.NM_MK}\nTanggal Ujian: ${ujian.TGL_UJIAN}\nJam: ${ujian.JAM_UJIAN}\nRuang: ${ujian.RUANG_UJIAN}`
      : "Data jadwal ujian tidak ditemukan.";
  }
}

module.exports = { handleJadwalUjian };