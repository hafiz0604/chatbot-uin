const axios = require('axios');
const API_URL = "http://api.uin-suka.ac.id/akademik/v2";

// Fungsi bantu: Capitalize hari
function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
}

// Fungsi bantu: Ambil kode prodi dari NIM (5 digit awal, bisa diubah sesuai format UIN SuKa)
function getKdProdiFromNim(nim) {
  return nim ? nim.substr(0, 5) : null;
}

/**
 * Handler Jadwal Kuliah
 * @param {object} args - { message, parameters, token, kd_prodi, nim, getTahunAjaranFromText, getSemesterFromText, getHariFromText }
 */
async function handleJadwalKuliah({
  message,
  parameters = {},
  token,
  kd_prodi,
  nim,
  getTahunAjaranFromText,
  getSemesterFromText,
  getHariFromText
}) {
  // Ambil tahun ajaran, semester, hari dari parameter atau parsing message
  const tahunAjaran = parameters.kd_ta || (getTahunAjaranFromText && getTahunAjaranFromText(message)) || "2024";
  const semester = parameters.kd_smt || (getSemesterFromText && getSemesterFromText(message)) || "1";
  const hari = parameters.hari || (getHariFromText && getHariFromText(message)) || "";

  // PATCH: Ambil kd_prodi dari nim jika tidak dikirim dari frontend
  const kodeProdi = kd_prodi || getKdProdiFromNim(nim);

  // Validasi wajib
  if (!token) return "Token autentikasi tidak ditemukan. Silakan login ulang.";
  if (!kodeProdi) return "Kode prodi tidak ditemukan. Pastikan Anda sudah login dan NIM Anda benar.";
  if (!tahunAjaran || !semester) {
    return "Mohon masukkan tahun ajaran (misal: 2025) dan semester (misal: 8).";
  }

  let data_search = `KD_TA = '${tahunAjaran}' and KD_SMT = '${semester}' and KD_PRODI = '${kodeProdi}'`;
  if (hari) {
    data_search += ` and HARI = '${capitalize(hari)}'`;
  }
  const body = new URLSearchParams({ data_search });

  try {
    const resp = await axios.post(`${API_URL}/getKelas`, body, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const kelasList = resp.data?.data;
    if (kelasList && kelasList.length > 0) {
      return kelasList.map(kelas =>
        `Mata Kuliah: ${kelas.NM_MK}\nKelas: ${kelas.KELAS_PARAREL}\nDosen: ${kelas.NM_DOSEN}\nJadwal: ${kelas.HARI}, ${kelas.JAM}`
      ).join('\n\n');
    } else {
      return "Data jadwal kuliah tidak ditemukan untuk tahun ajaran, semester, atau hari tersebut.";
    }
  } catch (error) {
    return "Terjadi kesalahan saat mengambil data jadwal kuliah. Silakan coba lagi nanti.";
  }
}

module.exports = { handleJadwalKuliah };