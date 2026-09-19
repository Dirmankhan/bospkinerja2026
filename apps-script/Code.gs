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
  var found = findDataSheets_(ss);
  var dataSheet = found[DATA_SHEET_HEADER_HINT];
  var gugusSheet = found[GUGUS_SHEET_HEADER_HINT];
  if (!dataSheet) throw new Error('Tidak menemukan tab dengan kolom "' + DATA_SHEET_HEADER_HINT + '".');

  var dataRows = readRows_(dataSheet);
  var gugusRows = gugusSheet ? readRows_(gugusSheet) : [];

  // Jadwal Bimtek/Refleksi Implementasi & Kewenangan per Gugus Belajar (dipakai sebagai lookup
  // metadata saja). Sumber kebenaran untuk JUMLAH sekolah & gugus adalah tab data mentah
  // (satu baris = satu sekolah), bukan kolom rekap di tab ini.
  var scheduleByGugus = {};
  gugusRows.forEach(function (r) {
    var gName = textVal_(r["Nama Gugus Belajar"]);
    if (gName) scheduleByGugus[gName] = r;
  });

  // Kelompokkan HANYA berdasarkan Nama Gugus Belajar (unik secara global di seluruh sheet),
  // bukan kombinasi Kab/Kota+nama — supaya satu gugus tidak pernah terhitung dua kali walau
  // ada baris sekolah yang menulis Kab/Kota-nya sedikit berbeda (typo/spasi) untuk gugus yang
  // sama. Kab/Kota gugus ditentukan dari kemunculan pertamanya di tab data.
  var byGugus = {};
  var gugusOrder = [];
  dataRows.forEach(function (r) {
    var kabKota = textVal_(r["Kab/Kota"]);
    var gName = textVal_(r["Gugus Belajar"]);
    var jenjang = textVal_(r["Jenjang"]);
    if (!kabKota || !gName) return;

    if (!byGugus[gName]) {
      var sched = scheduleByGugus[gName] || {};
      var kewenangan = textVal_(sched["Kewenangan"]);
      var gelBimtek = textVal_(sched["Gelombang Bimtek"]) || null;
      var gelImpl = textVal_(sched["Gelombang Refleksi Implementasi"]) || null;
      byGugus[gName] = {
        kabKota_: kabKota,
        g: gName,
        c: {},
        t: 0,
        j: kewenangan === "Provinsi" ? "Dikmen" : "Dasmen",
        gel: gelBimtek,
        schools: [],
        tl: {
          gel: gelBimtek,
          bimtek_spmi_tgl: textVal_(sched["Tanggal Keg. Bimtek Tata Kelola"]) || null,
          bimtek_spmi_peny: textVal_(sched["Penyelenggara Bimtek Tata Kelola"]) || null,
          bimtek_spmi_tempat: textVal_(sched["Tempat Kegiatan Bimtek Tata Kelola"]) || null,
          bimtek_spmi_fasda: textVal_(sched["Fasda Bimtek Tata Kelola"]) || null,
          bimtek_lit_tgl: textVal_(sched["Tanggal Keg. Bimtek Litnum"]) || null,
          bimtek_lit_peny: textVal_(sched["Penyelenggara Bimtek Litnum"]) || null,
          bimtek_lit_tempat: textVal_(sched["Tempat Kegiatan Bimtek Litnum"]) || null,
          bimtek_lit_fasda: textVal_(sched["Fasda Bimtek Litnum"]) || null,
          bimtek_dig_tgl: textVal_(sched["Tanggal Keg. Bimtek Digitalisasi"]) || null,
          bimtek_dig_peny: textVal_(sched["Penyelenggara Bimtek Digitalisasi"]) || null,
          bimtek_dig_tempat: textVal_(sched["Tempat Kegiatan Bimtek Digitalisasi"]) || null,
          bimtek_dig_fasda: textVal_(sched["Fasda Bimtek Digitalisasi"]) || null,
          gel_impl: gelImpl,
          impl_spmi_tgl: textVal_(sched["Tanggal Keg. Refleksi Implementasi Tata Kelola"]) || null,
          impl_spmi_peny: textVal_(sched["Penyelenggara Refleksi Implementasi Tata Kelola"]) || null,
          impl_spmi_tempat: textVal_(sched["Tempat Kegiatan Refleksi Implementasi Tata Kelola"]) || null,
          impl_spmi_fasda: textVal_(sched["Fasda Refleksi Implementasi Tata Kelola"]) || null,
          impl_lit_tgl: textVal_(sched["Tanggal Keg. Refleksi Implementasi Litnum"]) || null,
          impl_lit_peny: textVal_(sched["Penyelenggara Refleksi Implementasi Litnum"]) || null,
          impl_lit_tempat: textVal_(sched["Tempat Kegiatan Refleksi Implementasi Litnum"]) || null,
          impl_lit_fasda: textVal_(sched["Fasda Refleksi Implementasi Litnum"]) || null,
          impl_dig_tgl: textVal_(sched["Tanggal Keg. Refleksi Implementasi Digitalisasi"]) || null,
          impl_dig_peny: textVal_(sched["Penyelenggara Refleksi Implementasi Digitalisasi"]) || null,
          impl_dig_tempat: textVal_(sched["Tempat Kegiatan Refleksi Implementasi Digitalisasi"]) || null,
          impl_dig_fasda: textVal_(sched["Fasda Refleksi Implementasi Digitalisasi"]) || null,
        },
      };
      gugusOrder.push(gName);
    }

    var record = byGugus[gName];
    record.schools.push({
      npsn: textVal_(r["NPSN"]),
      nama: textVal_(r["Nama Sekolah"]),
      kec: textVal_(r["kecamatan"]) || textVal_(r["Kecamatan"]),
      pid: Number(r["Penerima PID"]) === 1,
      jenjang: jenjang,
      status: textVal_(r["Status"]),
    });
    record.t += 1;
    if (jenjang) record.c[jenjang] = (record.c[jenjang] || 0) + 1;
  });

  // Susun kab -> [gugus, ...] — setiap nama gugus muncul tepat satu kali, di bawah Kab/Kota
  // dari kemunculan pertamanya di tab data.
  var kabOut = {};
  gugusOrder.forEach(function (gName) {
    var record = byGugus[gName];
    var kabKota = record.kabKota_;
    delete record.kabKota_;
    if (!kabOut[kabKota]) kabOut[kabKota] = [];
    kabOut[kabKota].push(record);
  });

  return { kab: kabOut, generatedAt: new Date().toISOString(), sheetUpdatedAt: sheetLastUpdatedCached_(ss) };
}

// Waktu terakhir Google Sheet sumber diubah (metadata file Drive) — dipakai dasbor untuk
// menampilkan "Update terakhir", berbeda dari generatedAt (waktu respons ini dibuat). DriveApp
// adalah panggilan API terpisah dari Sheets (lumayan lambat), jadi hasilnya di-cache sebentar
// supaya tidak setiap pemuatan dasbor ikut menunggunya — staleness 2 menit tidak masalah untuk
// label "Update terakhir".
function sheetLastUpdatedCached_(ss) {
  var cache = CacheService.getScriptCache();
  var cacheKey = "sheetUpdatedAt";
  try {
    var cached = cache.get(cacheKey);
    if (cached) return cached;
  } catch (e) { /* cache tidak tersedia, lanjut ambil langsung dari Drive */ }

  var value;
  try {
    value = DriveApp.getFileById(ss.getId()).getLastUpdated().toISOString();
  } catch (e) {
    return null;
  }
  try {
    cache.put(cacheKey, value, 120);
  } catch (e) { /* abaikan kalau gagal menyimpan cache */ }
  return value;
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

// Cari kedua tab sumber (data mentah & rekap gugus) dalam SATU kali jalan lewat semua sheet,
// bukan satu scan penuh terpisah per tab yang dicari — spreadsheet ini punya banyak tab
// (~15), jadi memindainya dua kali (dulu: sekali per header yang dicari) menggandakan jumlah
// pemanggilan Sheets API tanpa perlu. Berhenti lebih awal begitu keduanya ketemu.
function findDataSheets_(ss) {
  var sheets = ss.getSheets();
  var hints = [DATA_SHEET_HEADER_HINT, GUGUS_SHEET_HEADER_HINT];
  var found = {};
  for (var i = 0; i < sheets.length; i++) {
    if (found[DATA_SHEET_HEADER_HINT] && found[GUGUS_SHEET_HEADER_HINT]) break;
    var sheet = sheets[i];
    var lastCol = sheet.getLastColumn();
    var scanRows = Math.min(5, sheet.getLastRow());
    if (lastCol === 0 || scanRows === 0) continue;
    var values = sheet.getRange(1, 1, scanRows, lastCol).getValues();
    for (var rIdx = 0; rIdx < values.length; rIdx++) {
      var row = values[rIdx];
      hints.forEach(function (hint) {
        if (found[hint]) return;
        if (row.some(function (v) { return textVal_(v) === hint; })) {
          found[hint] = { sheet: sheet, headerRow: rIdx + 1, headers: row.map(textVal_) };
        }
      });
    }
  }
  return found;
}

// Baca semua baris data sebagai array of object {namaKolom: nilai}, mulai persis setelah baris
// header yang ditemukan oleh findDataSheets_ (headernya dipakai ulang, tidak diambil lagi).
function readRows_(found) {
  var sheet = found.sheet;
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  var headerRow = found.headerRow;
  if (lastRow <= headerRow) return [];

  var headers = found.headers;
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
