-- Migrasi foto kandidat blob: foto unggahan disimpan sebagai bytea di tabel candidates.
-- Aman dijalankan ulang.
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS photo_data bytea;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS photo_mime text;
