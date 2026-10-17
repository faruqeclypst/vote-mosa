# Pemilihan OSIS

Aplikasi voting digital pemilihan ketua OSIS. Dibangun ulang dari nol dengan
SvelteKit + TypeScript + Tailwind CSS, database Neon Postgres, deploy di Vercel.

Alur pemilih: masukkan kode token (5 karakter) → geser kartu kandidat ala Tinder
(kanan = pilih, kiri = lewati) → konfirmasi → suara tercatat. Token guru bernilai
2 poin, token siswa 1 poin. Satu token hanya bisa dipakai sekali.

## Cara setup

### 1. Buat database Neon

1. Buat project baru di [Neon](https://neon.tech) (paket gratis cukup).
2. Buka **SQL Editor**, tempel seluruh isi `schema.sql`, jalankan.
   Skema idempoten, aman dijalankan ulang. Tabel yang dibuat: `admins`,
   `candidates`, `tokens`, `votes`, `sessions`, `settings` (dengan seed awal).
3. Salin **connection string** (diawali `postgresql://...sslmode=require`).

### 2. Jalankan lokal

```bash
npm install --no-bin-links
cp .env.example .env   # lalu isi DATABASE_URL
npm run dev
```

Buka http://localhost:5173. Kunjungan pertama ke `/admin` mengarah ke
`/admin/setup` untuk membuat super admin pertama.

### 3. Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Import project di Vercel, tambahkan Environment Variable `DATABASE_URL`
   (isi connection string Neon).
3. Deploy. Tidak perlu konfigurasi build khusus, `svelte.config.js` sudah
   memakai `@sveltejs/adapter-vercel`.

## Struktur

```
src/
  lib/
    db.ts        # koneksi Neon (@neondatabase/serverless), tanpa ORM
    auth.ts      # session admin, bcryptjs
    api.ts       # helper validasi untuk endpoint admin
    components/
      CandidateDeck.svelte   # deck swipe kandidat (pointer events, tanpa lib)
      admin/                 # 6 tab dashboard: Stats, Candidates, Tokens,
                             # Results, Settings, Admins
  routes/
    +page.svelte             # landing
    vote/                    # alur voting 4 langkah
    api/vote/                # validate, submit (transaksional, race-safe)
    admin/                   # setup, login, dashboard
    api/admin/               # login, logout, setup, stats, results,
                             # candidates, tokens, settings, admins
schema.sql                   # skema database idempoten + seed settings
```

## Catatan keamanan

- Password admin di-hash dengan bcrypt (bcryptjs, murni JS).
- Session admin disimpan di tabel `sessions`, cookie `sid` httpOnly,
  SameSite=Lax, Secure saat produksi, kedaluwarsa 12 jam.
- Submit suara berjalan dalam transaksi Postgres dengan `SELECT ... FOR UPDATE`
  pada token, plus constraint UNIQUE di `votes.token_id` sebagai pengaman ganda.
- Tabel hasil suara tidak pernah menampilkan kode token, hanya tipe pemilih.

## Yang belum diverifikasi

Butuh `DATABASE_URL` asli untuk: menjalankan `schema.sql` di Neon, lalu smoke
test (setup admin → tambah kandidat → generate token → voting → cek hasil).
