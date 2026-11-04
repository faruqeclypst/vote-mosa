-- Hapus fitur visi & misi total (permintaan alfa 2026-11-04).
ALTER TABLE candidates DROP COLUMN IF EXISTS vision;
ALTER TABLE candidates DROP COLUMN IF EXISTS mission;
