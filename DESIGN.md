# Arah desain: pemilihan-osis

Catatan kejujuran (R-37): arahan ini disusun agen karena alfa tidak memberi arahan visual
eksplisit. Boleh direvisi kapan saja. Dial: **ENERGY 2 / RHYTHM 2 / MOTION 1**.

## Identitas

"**Kertas suara**": aplikasi ini meniru pengalaman mencoblos. Kertas krem hangat
sebagai kanvas, tinta hitam pekat untuk teks, merah bendera sebagai satu-satunya
aksen. Judul memakai serif (Georgia) agar terasa seperti dokumen resmi pemilihan;
isi memakai system sans agar ringan dan cepat (tanpa unduhan font).

## Palet (R-29: 3 warna inti + 1 aksen)

- Kertas: `#faf6ee` (latar), `#f1e9d8` (latar dalam)
- Tinta: `#23201b` (teks, kontras 15.06:1), `#5c554b` (teks sekunder, 6.82:1)
- Garis: `#e0d5c0` (pemisah halus)
- Aksen: merah `#b3261e` (teks putih di atasnya 6.54:1, lolos AA)

## Motif identitas

- **Medali nomor urut kandidat**: lingkaran tinta dengan angka, dipakai di kartu
  deck dan konfirmasi. Alasan: meniru nomor urut di surat suara, jadi penanda
  visual yang konsisten di seluruh alur.
- **Bingkai kartu 2px tinta**: kartu terasa seperti potongan kertas suara,
  bukan kartu generik. Alasan: memberi bobot pada momen memilih.

## Keputusan dan alasannya (R-31)

- Tema terang saja, tanpa toggle gelap: produk content-first untuk pemilih umum,
  tidak ada alasan brand untuk gelap (R-21).
- Tanpa gradien, tanpa glassmorphism, tanpa ikon dekoratif: satu-satunya ikon
  adalah centang di layar sukses dan panah tak dipakai; tombol memakai kata
  ("Pilih", "Lewati") bukan simbol, supaya jelas untuk semua usia.
- Motion hanya di fisika kartu swipe (tujuan UX: umpan balik arah pilihan)
  dan transisi hover tombol. Menghormati `prefers-reduced-motion`.
- Radius: 8-16px untuk kartu dan tombol (hierarki: kartu lebih besar dari
  tombol), bukan pil di mana-mana (R-11).
- Mobile-first: deck kartu selebar layar HP, tombol minimal 44-56px (R-03).
