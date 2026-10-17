# PEMOS — Pemilihan OSIS

Aplikasi voting digital pemilihan ketua OSIS. SvelteKit + TypeScript + Tailwind CSS,
PostgreSQL (TCP lokal via driver `postgres`, tanpa ORM), jalan di Docker di belakang
Caddy reverse proxy: **https://pemos.alfaruqasri.my.id**.

Alur pemilih: masukkan kode token (5 karakter) → geser kartu kandidat
(kanan = pilih, kiri = lewati) → konfirmasi → suara tercatat. Token guru bernilai
2 poin, token siswa 1 poin. Satu token hanya bisa dipakai sekali.

## Token contoh (data dummy)

Setelah seed, token ini selalu bisa dipakai untuk mencoba voting:

| Kode   | Tipe   | Label |
|--------|--------|-------|
| ABCDE  | Siswa  | X-1   |
| GURU1  | Guru   | Guru  |
| SISWA  | Siswa  | XII-6 |

## Deploy di VPS (Docker)

```bash
# di VPS 43.134.175.87, mis. /opt/pemos
cp .env.example .env
# isi POSTGRES_PASSWORD di .env dengan password kuat

docker compose up -d --build

# siapkan database (sekali saja)
docker compose exec -T pemos-postgres psql -U pemos -d pemos < schema.sql
docker compose exec -T pemos-postgres psql -U pemos -d pemos < seed.sql
```

Lalu tambahkan blok `caddy-snippet.txt` ke Caddyfile dan reload Caddy:

```bash
caddy reload
```

Cek: `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3103/`
seharusnya `200`.

### Buat admin pertama

1. Buka https://pemos.alfaruqasri.my.id/admin
2. Karena tabel `admins` masih kosong, otomatis diarahkan ke `/admin/setup`.
3. Isi nama, email, password (min 8 karakter) → jadi super admin, langsung login.

## Jalankan lokal (tanpa docker)

Butuh PostgreSQL lokal. Buat database `pemos`, lalu:

```bash
npm install --no-bin-links
cp .env.example .env   # isi DATABASE_URL, mis. postgres://pemos:pass@localhost:5432/pemos
psql $DATABASE_URL -f schema.sql
psql $DATABASE_URL -f seed.sql
node node_modules/vite/bin/vite.js dev
```

(`npm run dev` tidak jalan di VM ini karena install memakai `--no-bin-links`.)

## Struktur

```
src/
  lib/
    db.ts        # driver postgres (porsager), SQL murni tanpa ORM
    auth.ts      # session admin, bcryptjs
    api.ts       # helper validasi endpoint admin
    components/
      Photo.svelte           # foto kandidat + fallback avatar inisial (onerror)
      CandidateDeck.svelte   # deck swipe kandidat (pointer events, tanpa lib)
      admin/                 # 6 tab: Ringkasan, Kandidat, Token, Hasil, Pengaturan, Kelola Admin
  routes/
    +page.svelte             # landing
    vote/                    # alur voting 4 langkah
    api/vote/                # validate, submit (transaksional: SELECT..FOR UPDATE + UNIQUE)
    admin/                   # setup, login, dashboard
    api/admin/               # login, logout, setup, stats, results, candidates,
                             # tokens (+generate/export CSV), settings, admins
schema.sql                   # skema idempoten
seed.sql                     # data dummy: 3 kandidat, ~30 token, ~15 votes
Dockerfile / docker-compose.yml / .dockerignore / caddy-snippet.txt
```

## Catatan

- Password admin di-hash bcrypt (bcryptjs, murni JS).
- Session admin di tabel `sessions`, cookie `sid` httpOnly, SameSite=Lax,
  Secure saat produksi, kedaluwarsa 12 jam.
- Submit suara dalam transaksi Postgres (`SELECT ... FOR UPDATE` pada token)
  plus constraint `UNIQUE(token_id)` sebagai pengaman ganda anti double-vote.
- Tabel hasil tidak menampilkan kode token, hanya tipe pemilih.
- Foto kandidat masih URL string biasa; komponen `Photo.svelte` selalu punya
  fallback avatar inisial bila URL rusak. Migrasi ke Cloudflare R2 tahap berikutnya.
- SQL ditulis murni (tanpa fitur khusus driver) supaya mudah pindah ke Neon/Vercel nanti.
