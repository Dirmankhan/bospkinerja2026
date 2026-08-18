/**
 * Backend Google Apps Script untuk Dasbor BOSP Kinerja Terbaik 2026.
 *
 * Dipasang (bound) ke Google Sheet "Gugus Belajar BOSP Kinerja Terbaik NTB".
 * doGet()  -> membaca sheet, menyusun JSON { kab: {...} } sesuai bentuk yang
 *             dipakai oleh index.html, dipakai oleh tombol "Segarkan" & saat halaman dibuka.
 * doPost() -> menerima unggahan link RTL dari Halaman "Pelaksanaan & Tugas" lalu
 *             menyimpannya ke tab "hasilrtl" (dibuat otomatis bila belum ada).
 *
 * Cara pasang: lihat README.md di root repo ini.
 */

var JENJANG_LIST = ["PAUD", "PKBM", "SD", "SKB", "SLB", "SMA", "SMK", "SMP"];

// Header (harus persis, tanpa memandang huruf besar/kecil & spasi berlebih) yang dipakai
// untuk mengenali sheet sumber, supaya script tetap bekerja walau nama tab sheet diganti.
var DATA_SHEET_HEADER_HINT = "Jenis BOSP";
var GUGUS_SHEET_HEADER_HINT = "Nama Gugus Belajar";

function doGet(e) {
  var payload;
  try {
    payload = buildDashboardData_();
  } catch (err) {
    payload = { kab: {}, error: String(err && err.message ? err.message : err) };
  }
  return jsonOutput_(payload);
}

function doPost(e) {
  var result = { ok: false };
  try {
    var body = JSON.parse(e.postData.contents);
    appendRtlSubmission_(body);
    result = { ok: true };
  } catch (err) {
    result = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  return jsonOutput_(result);
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ----------------------------------------------------------------------- */

function buildDashboardData_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dataSheet = findSheetByHeader_(ss, DATA_SHEET_HEADER_HINT);
  var gugusSheet = findSheetByHeader_(ss, GUGUS_SHEET_HEADER_HINT);
  if (!dataSheet) throw new Error('Tidak menemukan tab dengan kolom "' + DATA_SHEET_HEADER_HINT + '".');
  if (!gugusSheet) throw new Error('Tidak menemukan tab dengan kolom "' + GUGUS_SHEET_HEADER_HINT + '".');

  var dataRows = readRows_(dataSheet);
  var gugusRows = readRows_(gugusSheet);

  // Kelompokkan daftar sekolah per Gugus Belajar dari tab data mentah.
  var schoolsByGugus = {};
  dataRows.forEach(function (r) {
    var g = textVal_(r["Gugus Belajar"]);
    if (!g) return;
    if (!schoolsByGugus[g]) schoolsByGugus[g] = [];
    schoolsByGugus[g].push({
      npsn: textVal_(r["NPSN"]),
      nama: textVal_(r["Nama Sekolah"]),
      kec: textVal_(r["kecamatan"]) || textVal_(r["Kecamatan"]),
      pid: Number(r["Penerima PID"]) === 1,
      jenjang: textVal_(r["Jenjang"]),
      status: textVal_(r["Status"]),
    });
  });

  // Susun satu record per Gugus Belajar dari tab rekap/jadwal.
  var kab = {};
  gugusRows.forEach(function (r) {
    var kabKota = textVal_(r["Kab/Kota"]);
    var gName = textVal_(r["Nama Gugus Belajar"]);
    if (!kabKota || !gName) return;

    var counts = {};
    var total = 0;
    JENJANG_LIST.forEach(function (j) {
      var n = Number(r[j]) || 0;
      if (n > 0) { counts[j] = n; total += n; }
    });
    if (total === 0) total = Number(r["Jumlah"]) || 0;

    var kewenangan = textVal_(r["Kewenangan"]);
    var jenis = kewenangan === "Provinsi" ? "Dikmen" : "Dasmen";
    var gelBimtek = textVal_(r["Gelombang Bimtek"]) || null;
    var gelImpl = textVal_(r["Gelombang Implementasi"]) || null;

    var record = {
      g: gName,
      c: counts,
      t: total,
      j: jenis,
      gel: gelBimtek,
      schools: schoolsByGugus[gName] || [],
      tl: {
        gel: gelBimtek,
        bimtek_spmi_tgl: textVal_(r["Tanggal Keg. Bimtek SPMI"]) || null,
        bimtek_spmi_peny: textVal_(r["Penyelenggara Bimtek SPMI"]) || null,
        bimtek_spmi_fasda: textVal_(r["Fasda Bimtek SPMI"]) || null,
        bimtek_lit_tgl: textVal_(r["Tanggal Keg. Bimtek Litnum"]) || null,
        bimtek_lit_peny: textVal_(r["Penyelenggara Bimtek Litnum"]) || null,
        bimtek_lit_fasda: textVal_(r["Fasda Bimtek Litnum"]) || null,
        bimtek_dig_tgl: textVal_(r["Tanggal Keg. Bimtek Digitalisasi"]) || null,
        bimtek_dig_peny: textVal_(r["Penyelenggara Bimtek Digitalisasi"]) || null,
        bimtek_dig_fasda: textVal_(r["Fasda Bimtek Digitalisasi"]) || null,
        gel_impl: gelImpl,
        impl_spmi_tgl: textVal_(r["Tanggal Keg. Implementasi SPMI"]) || null,
        impl_spmi_peny: textVal_(r["Penyelenggara Implementasi SPMI"]) || null,
        impl_spmi_fasda: textVal_(r["Fasda Implementasi SPMI"]) || null,
        impl_lit_tgl: textVal_(r["Tanggal Keg. Implementasi Litnum"]) || null,
        impl_lit_peny: textVal_(r["Penyelenggara Implementasi Litnum"]) || null,
        impl_lit_fasda: textVal_(r["Fasda Implementasi Litnum"]) || null,
        impl_dig_tgl: textVal_(r["Tanggal Keg. Implementasi Digitalisasi"]) || null,
        impl_dig_peny: textVal_(r["Penyelenggara Implementasi Digitalisasi"]) || null,
        impl_dig_fasda: textVal_(r["Fasda Implementasi Digitalisasi"]) || null,
      },
    };

    if (!kab[kabKota]) kab[kabKota] = [];
    kab[kabKota].push(record);
  });

  return { kab: kab, generatedAt: new Date().toISOString() };
}

function appendRtlSubmission_(body) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("hasilrtl");
  if (!sheet) {
    sheet = ss.insertSheet("hasilrtl");
    sheet.appendRow([
      "Waktu", "Kewenangan", "Kabupaten/Kota", "Gugus Belajar",
      "Satuan Pendidikan", "Nama Pengunggah", "Link Dokumen RTL", "Link Bahan/Hasil RTL",
    ]);
  }
  sheet.appendRow([
    new Date(),
    body.kewenangan || "",
    body.kabupaten || "",
    body.gugus || "",
    body.sekolah || "",
    body.pengirim || "",
    body.rtlLink || "",
    body.bahanLink || "",
  ]);
}

/* ---------------------------- util sheet -------------------------------- */

// Cari sheet yang salah satu dari 5 baris pertamanya memuat kolom `headerHint`.
function findSheetByHeader_(ss, headerHint) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    var lastCol = sheet.getLastColumn();
    var scanRows = Math.min(5, sheet.getLastRow());
    if (lastCol === 0 || scanRows === 0) continue;
    var values = sheet.getRange(1, 1, scanRows, lastCol).getValues();
    for (var rIdx = 0; rIdx < values.length; rIdx++) {
      if (values[rIdx].some(function (v) { return textVal_(v) === headerHint; })) {
        return { sheet: sheet, headerRow: rIdx + 1 };
      }
    }
  }
  return null;
}

// Baca semua baris data sebagai array of object {namaKolom: nilai}, mulai persis
// setelah baris header yang ditemukan oleh findSheetByHeader_.
function readRows_(found) {
  var sheet = found.sheet;
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  var headerRow = found.headerRow;
  if (lastRow <= headerRow) return [];

  var headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0].map(textVal_);
  var values = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, lastCol).getValues();

  return values
    .map(function (row) {
      var obj = {};
      headers.forEach(function (h, i) {
        if (h) obj[h] = row[i];
      });
      return obj;
    })
    .filter(function (obj) {
      return Object.keys(obj).some(function (k) { return textVal_(obj[k]) !== ""; });
    });
}

// Ubah nilai sel (termasuk objek Date) menjadi teks yang rapi.
function textVal_(v) {
  if (v === null || v === undefined || v === "") return "";
  if (Object.prototype.toString.call(v) === "[object Date]") {
    return formatIndonesianDate_(v);
  }
  return String(v).trim();
}

var INDO_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
function formatIndonesianDate_(d) {
  return d.getDate() + " " + INDO_MONTHS[d.getMonth()];
}
