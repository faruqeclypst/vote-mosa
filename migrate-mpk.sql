-- Migrasi: dukungan pemilihan MPK (Majelis Perwakilan Kelas) berdampingan dengan OSIS.
-- Idempoten: aman dijalankan ulang.
-- Urutan di VPS: schema.sql (versi lama, sudah pernah jalan) -> migrate-mpk.sql -> seed.sql
--
-- Aturan main setelah migrasi:
-- - Satu token = satu suara PER pemilihan aktif (unik per token_id + election).
-- - Poin tetap: guru = 2, siswa = 1, per suara.
-- - Kode baru memakai settings osis_open / mpk_open; settings voting_open lama diabaikan.

-- 1. Kolom election di candidates (data lama otomatis 'osis')
ALTER TABLE candidates
	ADD COLUMN IF NOT EXISTS election text NOT NULL DEFAULT 'osis'
	CHECK (election IN ('osis', 'mpk'));

-- 2. Kolom election di votes
ALTER TABLE votes
	ADD COLUMN IF NOT EXISTS election text NOT NULL DEFAULT 'osis'
	CHECK (election IN ('osis', 'mpk'));

-- 3. Backfill election pada votes dari kandidatnya (idempoten; untuk data lama hasilnya 'osis')
UPDATE votes v
SET election = c.election
FROM candidates c
WHERE v.candidate_id = c.id
	AND v.election IS DISTINCT FROM c.election;

-- 4. Unique per (token_id, election) menggantikan unique per token_id
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_token_id_key;
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'votes_token_election_key') THEN
		ALTER TABLE votes ADD CONSTRAINT votes_token_election_key UNIQUE (token_id, election);
	END IF;
END $$;

-- 5. Index pendukung
CREATE INDEX IF NOT EXISTS idx_candidates_election ON candidates (election);
CREATE INDEX IF NOT EXISTS idx_votes_election ON votes (election);

-- 6. Settings osis_open & mpk_open; hormati voting_open lama bila ada
INSERT INTO settings (key, value)
VALUES
	('osis_open', COALESCE((SELECT value FROM settings WHERE key = 'voting_open'), 'true')),
	('mpk_open', 'false')
ON CONFLICT (key) DO NOTHING;
