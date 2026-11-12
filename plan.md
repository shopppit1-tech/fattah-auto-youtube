# Rencana FATTAH AUTO YOUTUBE

## Ruang lingkup
FATTAH AUTO YOUTUBE adalah dashboard otomasi pemutaran video atau playlist YouTube. Pengguna memasukkan URL, mengatur sesi default setiap 3 jam dengan durasi 4 jam, mengaktifkan atau menghentikan otomasi, lalu melihat riwayat sesi.

## Pendekatan implementasi
- **Frontend:** React + TypeScript + Vite, dibangun sebagai output statis yang dapat dipublikasikan ke GitHub Pages. Semua URL API memakai konfigurasi runtime (`VITE_API_BASE_URL`) sehingga frontend dan backend tetap terpisah.
- **Pemutar:** YouTube IFrame Player API dengan mode video tunggal atau playlist, autoplay playlist, dan callback status untuk mencatat sesi.
- **Backend:** Python FastAPI sebagai backend Enzonik Python, menyediakan endpoint status, konfigurasi sumber, kontrol Start/Stop, dan riwayat sesi.
- **Scheduler:** modul Python berbasis asyncio dengan interval 3 jam dan batas sesi 4 jam. Implementasi MVP menjaga state scheduler pada proses backend dan menyiapkan titik integrasi untuk worker persisten saat production.
- **Data:** database proyek menyimpan konfigurasi dan riwayat sesi melalui API backend; fallback in-memory digunakan hanya untuk development tanpa koneksi database.
- **Deployment:** frontend dipisahkan sebagai static build untuk GitHub Pages; backend dipaketkan sebagai service Python. Kontrak API dan `.env.example` mendokumentasikan cara menghubungkan keduanya.

## Struktur proyek
- `frontend/` — aplikasi dashboard React, komponen pemutar dan tabel riwayat.
- `backend/` — FastAPI, parser URL YouTube, scheduler, model data, dan endpoint API.
- `public/manus-routes.json` — manifest route halaman dashboard.
- `Dockerfile` — runtime backend Python untuk deployment container.
- `.github/workflows/deploy-pages.yml` — contoh workflow build/deploy frontend ke GitHub Pages.
- `README.md` — setup lokal, konfigurasi API, dan catatan deployment.

## Desain
### Alternatif gaya
1. **Control-room industrial** — 0.06: dashboard gelap dengan aksen hijau sinyal dan panel status teknis.
2. **Editorial warm** — 0.04: layout terang, tipografi serif, dan aksen merah bata.
3. **Neon media console** — 0.08: permukaan gelap, cyan-magenta, dan efek glow.

**Pilihan:** Control-room industrial.

- **Design Movement:** industrial control-room modern yang terinspirasi panel monitoring siaran.
- **Core Principles:** status selalu terlihat; informasi padat tetapi berhierarki; aksi penting punya kontras tinggi; setiap sesi meninggalkan jejak audit.
- **Color Philosophy:** graphite dan ink memberi fokus; hijau signal menandai aktif/aman; amber menandai perhatian; merah hanya untuk Stop dan error.
- **Layout Paradigm:** rail navigasi tipis di kiri, header status horizontal, lalu kanvas utama asimetris dengan panel pemutar besar dan kolom kontrol/riwayat.
- **Signature Elements:** garis indikator seperti waveform, badge status berbentuk kapsul teknis, serta nomor sesi monospaced.
- **Interaction Philosophy:** Start terasa seperti mengaktifkan sistem; Stop meminta satu aksi langsung; perubahan status muncul melalui transisi singkat, bukan dekorasi berlebihan.
- **Animation:** pulse halus pada status aktif, progress bar sesi bergerak linear, panel masuk dengan fade/translate pendek; hindari animasi looping selain status live.
- **Typography System:** `Space Grotesk` untuk heading dan label; `IBM Plex Mono` untuk waktu, URL, dan status teknis.
- **Brand Essence:** operator pemutaran YouTube yang ringkas dan dapat diaudit — terkendali, presisi, operasional.
- **Brand Voice:** CTA seperti “Aktifkan jadwal” dan “Hentikan sesi”; microcopy seperti “Sistem siap menerima sumber baru.”
- **Wordmark & Logo:** wordmark uppercase dengan ikon tombol play yang dipotong oleh garis timeline.
- **Signature Brand Color:** signal green `#B8F45B`.

## Kontrak API utama
- `GET /api/health`
- `GET /api/state`
- `PUT /api/source` dengan `{ url }`
- `POST /api/start`
- `POST /api/stop`
- `GET /api/history`
- `POST /api/sessions/{id}/complete`

## Keputusan produk
- URL video dan playlist divalidasi di frontend dan backend.
- Start hanya tersedia setelah sumber valid tersimpan.
- Stop menghentikan scheduler dan menandai sesi aktif sebagai stopped.
- Jadwal default 3 jam dan durasi 4 jam ditampilkan jelas dan dikirim sebagai metadata state.
- Riwayat menampilkan sumber, mulai, selesai, durasi, dan status.
