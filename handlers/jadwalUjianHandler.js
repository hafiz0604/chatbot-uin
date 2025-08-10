const axios = require('axios');
const API_URL = "http://api.uin-suka.ac.id/akademik/v2";

// Helper untuk ambil kode prodi dari NIM (5 digit awal, sesuaikan jika format berbeda)
function getKdProdiFromNim(nim) {
  return nim ? nim.substr(0, 5) : null;
}

async function handleJadwalUjian({
  message,
  parameters = {},
  token,
  kd_prodi,
  nim,
  getTahunAjaranFromText,
  getSemesterFromText
}) {
  console.log("=== MASUK HANDLER UJIAN ===");
  const tahunAjaran = parameters.kd_ta || (getTahunAjaranFromText && getTahunAjaranFromText(message)) || "2024";
  const semester = parameters.kd_smt || (getSemesterFromText && getSemesterFromText(message)) || "1";
  const kodeProdi = kd_prodi || getKdProdiFromNim(nim);

  if (!token) return "Token autentikasi tidak ditemukan. Silakan login ulang.";
  if (!kodeProdi) return "Kode prodi tidak ditemukan. Pastikan Anda sudah login dan NIM Anda benar.";
  if (!tahunAjaran || !semester) {
    return "Mohon masukkan tahun ajaran (misal: 2025) dan semester (misal: 8).";
  }

  let data_search = `KD_TA = '${tahunAjaran}' and KD_SMT = '${semester}' and KD_PRODI = '${kodeProdi}'`;
  const body = new URLSearchParams({ data_search });

  try {
    const resp = await axios.post(`${API_URL}/getJadwalUjian`, body, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const ujianList = resp.data?.data;
    if (ujianList && ujianList.length > 0) {
      return ujianList.map(ujian =>
        `Mata Kuliah: ${ujian.NM_MK}\nKelas: ${ujian.KELAS_PARAREL}\nDosen: ${ujian.NM_DOSEN}\nTanggal: ${ujian.TGL_UJIAN}\nJam: ${ujian.JAM_UJIAN}\nRuang: ${ujian.RUANG_UJIAN || "-"}`
      ).join('\n\n');
    } else {
      return "Jadwal ujian tidak ditemukan. Mungkin jadwal UAS belum diumumkan atau saat ini masih libur.";
    }
  } catch (error) {
    return "Terjadi kesalahan saat mengambil data jadwal UAS. Silakan coba lagi nanti.";
  }
}

module.exports = { handleJadwalUjian };