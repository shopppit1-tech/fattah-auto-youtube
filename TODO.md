# TODO FATTAH AUTO YOUTUBE

## Dashboard sumber dan pemutar — selesai
- [x] Pengguna dapat memasukkan URL video atau playlist YouTube.
- [x] Sistem memvalidasi URL video atau playlist dan menampilkan sumber yang aktif.
- [x] Pemutar menggunakan YouTube IFrame Player API.
- [x] Playlist diputar otomatis dan berlanjut ke item berikutnya melalui konfigurasi IFrame API.

## Scheduler dan kontrol otomasi — selesai
- [x] Scheduler Python menjadwalkan pemutaran setiap 3 jam.
- [x] Setiap sesi memiliki durasi 4 jam.
- [x] Jadwal mengulang otomatis setelah otomasi diaktifkan.
- [x] Pengguna dapat mengedit interval pengulangan dan durasi sesi dari dashboard; nilai disimpan di backend dan dipakai scheduler berikutnya.
- [x] Tombol Start mengaktifkan jadwal dan memulai alur pemutaran otomatis.
- [x] Tombol Stop menghentikan jadwal dan sesi pemutaran yang sedang berjalan.

## Riwayat pemutaran — selesai
- [x] Dashboard riwayat menampilkan sumber YouTube, waktu mulai, waktu selesai, durasi, dan status sesi.
- [x] Riwayat diperbarui setelah sesi dimulai atau dihentikan.

## Arsitektur deployment — siap, publikasi eksternal menunggu repository
- [x] Frontend dibangun sebagai static site yang dapat diterbitkan di GitHub Pages.
- [x] Backend menggunakan Enzonik Python dan menyediakan endpoint komunikasi frontend.
- [x] Scheduler berjalan di backend Python dan memiliki konfigurasi environment terdokumentasi.
- [x] Setup lokal dan deployment frontend/backend dijelaskan di README.
- [ ] Hubungkan repository GitHub milik pengguna, isi `VITE_API_BASE_URL`, dan jalankan workflow Pages untuk publikasi eksternal.
