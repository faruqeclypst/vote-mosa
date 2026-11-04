-- Data dummy untuk demo pemilihan OSIS + MPK. Jalankan SETELAH schema.sql / migrate-mpk.sql.
-- Idempoten: aman dijalankan ulang (tidak menggandakan data).
-- Token contoh yang selalu tersedia untuk dicoba: ABCDE, GURU1, SISWA.

-- 3 kandidat OSIS dummy
INSERT INTO candidates (id, name, photo_url, election, sort_order) VALUES
	('a1a1a1a1-1111-4111-8111-111111111111', 'Rizky Pratama', 'https://i.pravatar.cc/400?img=12', 'osis', 0),
	('b2b2b2b2-2222-4222-8222-222222222222', 'Dinda Ayu Lestari', 'https://i.pravatar.cc/400?img=47', 'osis', 1),
	('c3c3c3c3-3333-4333-8333-333333333333', 'Fajar Nugroho', 'https://i.pravatar.cc/400?img=59', 'osis', 2)
ON CONFLICT (id) DO NOTHING;

-- 3 kandidat MPK dummy
INSERT INTO candidates (id, name, photo_url, election, sort_order) VALUES
	('d4d4d4d4-4444-4444-8444-444444444444', 'Bagas Aditya Pratama', 'https://i.pravatar.cc/400?img=5', 'mpk', 0),
	('e5e5e5e5-5555-4555-8555-555555555555', 'Sinta Maharani', 'https://i.pravatar.cc/400?img=32', 'mpk', 1),
	('f6f6f6f6-6666-4666-8666-666666666666', 'Yoga Saputra', 'https://i.pravatar.cc/400?img=68', 'mpk', 2)
ON CONFLICT (id) DO NOTHING;

-- Nyalakan pemilihan MPK untuk preview (admin bisa mematikan di Pengaturan)
INSERT INTO settings (key, value) VALUES ('mpk_open', 'true')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Token contoh yang mudah diingat (selalu belum dipakai)
INSERT INTO tokens (code, type, label) VALUES
	('ABCDE', 'student', 'X-1'),
	('GURU1', 'teacher', 'Guru'),
	('SISWA', 'student', 'XII-6')
ON CONFLICT (code) DO NOTHING;

DO $$
DECLARE
	alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	classes text[] := ARRAY['X-1','X-2','X-3','X-4','X-5','X-6',
		'XI-1','XI-2','XI-3','XI-4','XI-5','XI-6',
		'XII-1','XII-2','XII-3','XII-4','XII-5','XII-6'];
	known text[] := ARRAY['ABCDE','GURU1','SISWA'];
	v_code text;
	v_type text;
	v_label text;
	i int;
	j int;
	r record;
	cid uuid;
	pts int;
BEGIN
	-- 27 token acak (total ~30 bersama 3 token contoh), hanya jika belum ada
	IF (SELECT COUNT(*) FROM tokens) < 30 THEN
		FOR i IN 1..40 LOOP
			EXIT WHEN (SELECT COUNT(*) FROM tokens) >= 30;
			v_code := '';
			FOR j IN 1..5 LOOP
				v_code := v_code || substr(alphabet, 1 + floor(random() * 32)::int, 1);
			END LOOP;
			v_type := CASE WHEN random() < 0.7 THEN 'student' ELSE 'teacher' END;
			v_label := CASE WHEN v_type = 'student'
				THEN classes[1 + floor(random() * 18)::int]
				ELSE 'Guru' END;
			INSERT INTO tokens (code, type, label) VALUES (v_code, v_type, v_label)
			ON CONFLICT (code) DO NOTHING;
		END LOOP;
	END IF;

	-- ~15 suara contoh untuk pemilihan OSIS saja (MPK dibiarkan kosong agar terlihat seperti pemilihan baru).
	-- Token contoh ABCDE/GURU1/SISWA dibiarkan utuh untuk demo.
	IF (SELECT COUNT(*) FROM votes WHERE election = 'osis') < 15 THEN
		FOR r IN
			SELECT id, type FROM tokens
			WHERE is_used = false AND NOT (code = ANY (known))
			ORDER BY random()
			LIMIT 15
		LOOP
			SELECT id INTO cid FROM candidates WHERE election = 'osis' ORDER BY random() LIMIT 1;
			pts := CASE WHEN r.type = 'teacher' THEN 2 ELSE 1 END;
			UPDATE tokens SET is_used = true, used_at = now() WHERE id = r.id;
			INSERT INTO votes (candidate_id, token_id, election, points)
			VALUES (cid, r.id, 'osis', pts)
			ON CONFLICT (token_id, election) DO NOTHING;
		END LOOP;
	END IF;
END $$;
