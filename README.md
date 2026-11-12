# FATTAH AUTO YOUTUBE

Dashboard otomasi pemutaran video dan playlist YouTube dengan frontend React/Vite, backend Enzonik Python (FastAPI), scheduler berulang, dan riwayat sesi.

## Menjalankan frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend berjalan di `http://localhost:3000`. Jika backend belum dijalankan, dashboard menggunakan mode demo lokal berbasis `localStorage`, sehingga alur input URL, Start, Stop, pemutar, dan riwayat tetap dapat dicoba.

## Menjalankan backend

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app:app --reload --port 8000
```

Untuk menghubungkan frontend ke backend, salin `.env.example` ke environment build frontend dan set `VITE_API_BASE_URL=http://localhost:8000`. Backend menyediakan `GET /api/health`, `GET /api/state`, `PUT /api/source`, `POST /api/start`, `POST /api/stop`, dan `GET /api/history`.

## Perilaku scheduler

Sesi pertama dibuat ketika Start ditekan. Scheduler berikutnya membuat sesi setiap 10.800 detik (3 jam), dan menyelesaikan sesi aktif setelah 14.400 detik (4 jam). Nilai ini dapat diubah lewat `SCHEDULE_INTERVAL_SECONDS` dan `SESSION_DURATION_SECONDS`. Riwayat disimpan pada SQLite di `backend/data/fattah.sqlite3`.

## GitHub Pages

Workflow `.github/workflows/deploy-pages.yml` membangun isi `frontend/dist` dan menerbitkannya ke GitHub Pages. Set repository variable `VITE_API_BASE_URL` ke URL publik backend Python. Backend harus mengizinkan origin GitHub Pages melalui `CORS_ORIGINS`.

## Catatan deployment backend

`Dockerfile` menjalankan FastAPI pada `PORT` yang diberikan platform. Untuk production, gunakan storage persisten untuk folder `backend/data` atau pindahkan tabel sesi ke database managed agar riwayat tidak hilang saat container diganti.
