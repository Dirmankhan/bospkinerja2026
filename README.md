# Dasbor BOSP Kinerja Terbaik 2026 — BPMP Provinsi NTB

Replika dari dasbor `Dasbor BOSP Kinerja Terbaik 2026 - BPMP Provinsi NTB`, disambungkan ke
Google Sheet sumber baru:
[Gugus Belajar BOSP Kinerja Terbaik NTB](https://docs.google.com/spreadsheets/d/1DkcV9abO5Db_b-qFZ2cz14v74CBvFUW0IW2NafFK-64/edit).

Dasbor ini adalah satu file HTML statis (`index.html`, React + Babel dimuat langsung di
browser, tanpa proses build) yang mengambil datanya secara live dari Google Sheet lewat sebuah
Google Apps Script Web App (`apps-script/Code.gs`).

## Struktur repo

- `index.html` — dasbor (Sebaran Gugus Belajar & Data Sekolah, Jadwal & Fasda, Export Excel).
- `apps-script/Code.gs` — backend yang dipasang (bound) ke Google Sheet, menyediakan:
  - `doGet` — membaca sheet dan mengembalikan JSON data dasbor.
  - `doPost` — menerima unggahan link RTL dari halaman "Pelaksanaan & Tugas" dan menyimpannya
    ke tab `hasilrtl` (dibuat otomatis).

## Cara memasang (sekali saja)

1. Buka Google Sheet sumber di atas → menu **Extensions/Ekstensi → Apps Script**.
2. Hapus isi `Code.gs` bawaan, lalu tempel seluruh isi file
   [`apps-script/Code.gs`](./apps-script/Code.gs) dari repo ini.
3. Klik **Deploy → New deployment** (Deploy → Deployment baru).
   - Pilih tipe **Web app**.
   - **Execute as**: Me (akun kamu).
   - **Who has access**: Anyone (Siapa saja) — supaya dasbor bisa memuat data tanpa login.
   - Klik **Deploy**, izinkan akses saat diminta.
4. Salin URL Web App yang muncul (formatnya
   `https://script.google.com/macros/s/XXXXXXXX/exec`).
5. Buka `index.html` di repo ini, cari baris:
   ```js
   const APPS_SCRIPT_URL = "";
   ```
   dan tempel URL dari langkah 4 di antara tanda kutip.
6. Simpan lalu buka `index.html` di browser (bisa langsung dibuka dari file lokal, atau
   di-hosting misalnya lewat GitHub Pages). Data akan otomatis dimuat saat halaman dibuka, dan
   bisa disegarkan lagi lewat tombol **⟳ Segarkan**.

Setiap kali sheet sumber diperbarui, cukup klik **Segarkan** di dasbor (atau buka ulang
halamannya) — tidak perlu deploy ulang script kecuali kode `Code.gs` sendiri yang diubah. Jika
`Code.gs` diubah, gunakan **Deploy → Manage deployments → Edit (ikon pensil) → Deploy** supaya
URL Web App yang sama menggunakan versi kode terbaru.

## Struktur data yang diharapkan pada Google Sheet

Script mengenali tab berdasarkan judul kolom (bukan nama tab), jadi tab boleh diberi nama apa
saja asalkan judul kolomnya sama persis:

- **Tab data mentah per sekolah** — harus memuat kolom `Jenis BOSP`, `Kab/Kota`, `NPSN`,
  `Jenjang`, `Status`, `Nama Sekolah`, `Penerima PID`, `kecamatan`, `Gugus Belajar`.
- **Tab rekap per Gugus Belajar** — harus memuat kolom `Nama Gugus Belajar`, `Kab/Kota`,
  `Kewenangan`, kolom jumlah per jenjang (`PAUD`, `PKBM`, `SD`, `SKB`, `SLB`, `SMA`, `SMK`,
  `SMP`), `Jumlah`, `Gelombang Bimtek`, `Gelombang Implementasi`, serta kolom
  Tanggal/Penyelenggara/Fasda untuk Bimtek dan Implementasi (SPMI, Litnum, Digitalisasi).

Kedua tab ini sudah tersedia di Google Sheet sumber yang ditautkan di atas.

## Catatan penyesuaian dari dasbor asli

- Dasbor asli menyimpan **cadangan data statis** (snapshot lama, ratusan KB) langsung di dalam
  HTML supaya tetap tampil sebelum data live dimuat. Versi ini **tidak** menyertakan cadangan
  tersebut (karena datanya milik sheet lain), dan sebagai gantinya dasbor **otomatis memuat
  data langsung dari `APPS_SCRIPT_URL` saat halaman dibuka**, dengan tampilan status
  memuat/kosong/gagal yang jelas.
- Library React, ReactDOM, Babel, dan SheetJS (untuk fitur Export Excel) dimuat dari CDN,
  bukan disisipkan langsung ke file HTML — perilaku dan tampilannya identik, filenya jauh
  lebih ringan. Halaman butuh koneksi internet saat dibuka.
- Seluruh logika, tampilan, filter, grafik, dan halaman ("Sebaran Gugus", "Jadwal & Fasda")
  sama persis dengan dasbor asli.
