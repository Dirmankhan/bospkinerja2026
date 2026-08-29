# Dasbor BOSP Kinerja Terbaik 2026 — BPMP Provinsi NTB

Replika dari dasbor `Dasbor BOSP Kinerja Terbaik 2026 - BPMP Provinsi NTB`, disambungkan ke
Google Sheet sumber baru:
[Gugus Belajar BOSP Kinerja Terbaik NTB](https://docs.google.com/spreadsheets/d/1DkcV9abO5Db_b-qFZ2cz14v74CBvFUW0IW2NafFK-64/edit).

Dasbor ini adalah satu file HTML statis (`index.html`, React dimuat dari CDN, kode aplikasinya
sudah di-compile lebih dulu — lihat bagian "Mengubah tampilan/logika dasbor" di bawah) yang
mengambil datanya secara live dari Google Sheet lewat sebuah Google Apps Script Web App
(`apps-script/Code.gs`).

## Struktur repo

- `index.html` — dasbor siap pakai (Sebaran Gugus Belajar & Data Sekolah, Jadwal & Fasda,
  Daftar Fasda dengan pencarian & filter, Export Excel). Ini yang dibuka/di-hosting.
- `src/app.jsx` — source code React yang mudah dibaca/diedit (JSX). **Ini yang diedit kalau
  mau mengubah tampilan/logika** — bukan `index.html` langsung (lihat bagian di bawah).
- `build/compile.js` — script kecil yang men-generate ulang bagian kode di dalam `index.html`
  dari `src/app.jsx`.
- `apps-script/Code.gs` — backend yang dipasang (bound) ke Google Sheet, menyediakan:
  - `doGet` — membaca sheet dan mengembalikan JSON data dasbor, termasuk `sheetUpdatedAt`
    (waktu terakhir Google Sheet sumber diubah, dari metadata Google Drive) yang ditampilkan
    dasbor sebagai "Update terakhir" di bawah tombol Segarkan.
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
6. Di file yang sama, cari baris berikut dan ganti dengan password pilihanmu untuk mengunci
   tab **"Daftar Fasda"** (lihat catatan keamanan di bawah):
   ```js
   const FASDA_PAGE_PASSWORD = "GANTI_PASSWORD_INI";
   ```
7. Simpan lalu buka `index.html` di browser (bisa langsung dibuka dari file lokal, atau
   di-hosting misalnya lewat GitHub Pages). Data akan otomatis dimuat saat halaman dibuka, dan
   bisa disegarkan lagi lewat tombol **⟳ Segarkan**.

Setiap kali sheet sumber diperbarui, cukup klik **Segarkan** di dasbor (atau buka ulang
halamannya) — tidak perlu deploy ulang script kecuali kode `Code.gs` sendiri yang diubah. Jika
`Code.gs` diubah, gunakan **Deploy → Manage deployments → Edit (ikon pensil) → Deploy** supaya
URL Web App yang sama menggunakan versi kode terbaru.

## Struktur data yang diharapkan pada Google Sheet

Script mengenali tab berdasarkan judul kolom (bukan nama tab), jadi tab boleh diberi nama apa
saja asalkan judul kolomnya sama persis:

- **Tab data mentah per sekolah** (sumber kebenaran) — satu baris = satu sekolah. Harus memuat
  kolom `Jenis BOSP`, `Kab/Kota`, `NPSN`, `Jenjang`, `Status`, `Nama Sekolah`, `Penerima PID`,
  `kecamatan`, `Gugus Belajar`. **Jumlah sekolah, jumlah gugus, dan komposisi per jenjang di
  dasbor dihitung langsung dari baris-baris tab ini**, bukan dari kolom rekap manapun — supaya
  selalu sesuai dengan data sekolah yang sebenarnya.
- **Tab rekap per Gugus Belajar** (opsional, untuk metadata jadwal saja) — harus memuat kolom
  `Nama Gugus Belajar`, `Kewenangan`, `Gelombang Bimtek`, `Gelombang Implementasi`, serta kolom
  Tanggal/Penyelenggara/Fasda untuk Bimtek dan Implementasi (Tata Kelola, Litnum, Digitalisasi). Tab
  ini hanya dipakai untuk melengkapi info jadwal & fasilitator per gugus (dicocokkan lewat nama
  gugus) — kolom jumlah/jenjang di tab ini **tidak** dipakai untuk menghitung apa pun di dasbor.

Kedua tab ini sudah tersedia di Google Sheet sumber yang ditautkan di atas.

## Catatan penyesuaian dari dasbor asli

- Dasbor asli menyimpan **cadangan data statis** (snapshot lama, ratusan KB) langsung di dalam
  HTML supaya tetap tampil sebelum data live dimuat. Versi ini **tidak** menyertakan cadangan
  tersebut (karena datanya milik sheet lain), dan sebagai gantinya dasbor **otomatis memuat
  data langsung dari `APPS_SCRIPT_URL` saat halaman dibuka**, dengan tampilan status
  memuat/kosong/gagal yang jelas.
- Library React dan ReactDOM dimuat dari CDN saat halaman dibuka (bukan disisipkan langsung
  ke file HTML) — perilaku dan tampilannya identik, filenya jauh lebih ringan. SheetJS (untuk
  fitur Export Excel) baru dimuat **saat tombol Export diklik**, bukan di awal — supaya
  pengunjung yang tidak memakai fitur itu tidak ikut menunggu unduhan yang tidak terpakai.
  Halaman butuh koneksi internet saat dibuka.
- Seluruh logika, tampilan, filter, grafik, dan halaman ("Sebaran Gugus", "Jadwal & Fasda")
  sama persis dengan dasbor asli.
- Ditambahkan halaman ketiga **"Daftar Fasda"**: daftar seluruh penugasan Fasda (Bimtek &
  Implementasi × Tata Kelola/Litnum/Digitalisasi) dengan pencarian berdasarkan nama fasda dan
  export Excel.

## Mengubah tampilan/logika dasbor

`index.html` tidak lagi ditulis tangan langsung — bagian kodenya di-*generate* dari
`src/app.jsx` supaya browser pengunjung tidak perlu mengunduh Babel atau menerjemahkan JSX
sendiri (lebih cepat dimuat). Alurnya:

1. Edit `src/app.jsx` (ini file JSX yang mudah dibaca, sama seperti sebelumnya).
2. Sekali saja per lingkungan kerja: `npm install --no-save @babel/standalone`
3. Jalankan `node build/compile.js` dari root repo — ini akan menimpa ulang bagian kode di
   dalam `index.html` (di antara komentar `/* @COMPILED_APP_JSX_START@ */` dan
   `/* @COMPILED_APP_JSX_END@ */`) dengan hasil compile terbaru.
4. Commit `src/app.jsx` **dan** `index.html` yang sudah ter-update bersamaan.

Jangan edit bagian kode di dalam marker tersebut secara langsung di `index.html` — perubahan
itu akan tertimpa saat `build/compile.js` dijalankan lagi. Dua konfigurasi di `index.html`
(`APPS_SCRIPT_URL` dan `FASDA_PAGE_PASSWORD`) tetap aman diedit langsung di `index.html` seperti
biasa — dua baris itu ada di luar bagian yang di-generate.

## Catatan keamanan: password "Daftar Fasda"

Tab "Daftar Fasda" dikunci password (`FASDA_PAGE_PASSWORD`), tapi ini **bukan keamanan
sungguhan** — ini hanya gerbang sisi-browser untuk mencegah pengunjung random tidak sengaja
membuka tab tersebut. Karena `index.html` adalah file statis tanpa server, password ini
tersimpan sebagai teks biasa di dalam kode dan siapa pun yang membuka "View Page
Source"/DevTools browser tetap bisa melihat isi tabelnya tanpa perlu memasukkan password.
Jangan andalkan ini untuk melindungi data yang benar-benar sensitif — kalau butuh proteksi
sungguhan, perlu autentikasi di sisi server (di luar cakupan dasbor statis ini).
