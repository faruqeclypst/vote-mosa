-- Skema database pemilihan OSIS + MPK (Postgres). Idempoten: aman dijalankan ulang.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS admins (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	email text UNIQUE NOT NULL,
	name text NOT NULL,
	password_hash text NOT NULL,
	role text NOT NULL DEFAULT 'admin' CHECK (role IN ('super', 'admin')),
	created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS candidates (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	name text NOT NULL,
	photo_url text,
	photo_data bytea,
	photo_mime text,
	election text NOT NULL DEFAULT 'osis' CHECK (election IN ('osis', 'mpk')),
	sort_order int NOT NULL DEFAULT 0,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_candidates_election ON candidates (election);
-- Untuk database yang sudah ada sebelum fitur foto blob
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS photo_data bytea;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS photo_mime text;

CREATE TABLE IF NOT EXISTS tokens (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	code varchar(8) UNIQUE NOT NULL,
	type text NOT NULL CHECK (type IN ('student', 'teacher')),
	label text,
	is_used boolean NOT NULL DEFAULT false,
	used_at timestamptz,
	created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tokens_code ON tokens (code);
CREATE INDEX IF NOT EXISTS idx_tokens_used ON tokens (is_used);

CREATE TABLE IF NOT EXISTS votes (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	candidate_id uuid NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
	token_id uuid NOT NULL REFERENCES tokens (id),
	election text NOT NULL DEFAULT 'osis' CHECK (election IN ('osis', 'mpk')),
	points int NOT NULL CHECK (points IN (1, 2)),
	created_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT votes_token_election_key UNIQUE (token_id, election)
);
CREATE INDEX IF NOT EXISTS idx_votes_candidate ON votes (candidate_id);
CREATE INDEX IF NOT EXISTS idx_votes_election ON votes (election);

CREATE TABLE IF NOT EXISTS sessions (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	admin_id uuid NOT NULL REFERENCES admins (id) ON DELETE CASCADE,
	expires_at timestamptz NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS settings (
	key text PRIMARY KEY,
	value text NOT NULL
);

INSERT INTO settings (key, value) VALUES
	('osis_open', 'true'),
	('mpk_open', 'false'),
	('election_title', 'Pemilihan Ketua OSIS'),
	('school_name', 'SMAN Modal Bangsa')
ON CONFLICT (key) DO NOTHING;
