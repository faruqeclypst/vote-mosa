-- Data dummy untuk demo pemilihan OSIS. Jalankan SETELAH schema.sql.
-- Idempoten: aman dijalankan ulang (tidak menggandakan data).
-- Token contoh yang selalu tersedia untuk dicoba: ABCDE, GURU1, SISWA.

-- 3 kandidat dummy
INSERT INTO candidates (id, name, photo_url, vision, mission, sort_order) VALUES
	('a1a1a1a1-1111-4111-8111-111111111111', 'Rizky Pratama',
		'https://i.pravatar.cc/400?img=12',
		'Menjadikan OSIS sebagai wadah aspirasi yang aktif, transparan, dan dekat dengan seluruh siswa.',
		'Membuka kanal aspirasi rutin setiap bulan.' || chr(10) ||
		'Mengadakan forum terbuka antara OSIS dan perwakilan kelas.' || chr(10) ||
		'Mendorong program kerja yang melibatkan seluruh angkatan.',
		0),
	('b2b2b2b2-2222-4222-8222-222222222222', 'Dinda Ayu Lestari',
		'https://i.pravatar.cc/400?img=47',
		'OSIS yang kreatif dan peduli, menghadirkan kegiatan yang bermanfaat bagi siswa dan sekolah.',
		'Menggelar pelatihan kepemimpinan untuk pengurus kelas.' || chr(10) ||
		'Mengaktifkan kembali ekstrakurikuler yang vakum.' || chr(10) ||
		'Menjalin kerja sama kegiatan dengan OSIS sekolah lain.',
		1),
	('c3c3c3c3-3333-4333-8333-333333333333', 'Fajar Nugroho',
		'https://i.pravatar.cc/400?img=59',
		'Membangun OSIS yang disiplin, solid, dan berprestasi di bidang akademik maupun non-akademik.',
		'Menyusun kalender kegiatan tahunan yang realistis.' || chr(10) ||
		'Membentuk tim dukungan untuk lomba antar sekolah.' || chr(10) ||
		'Menerbitkan buletin sekolah setiap dua bulan.',
		2)
ON CONFLICT (id) DO NOTHING;

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
	code text;
	ttype text;
	lbl text;
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
			code := '';
			FOR j IN 1..5 LOOP
				code := code || substr(alphabet, 1 + floor(random() * 32)::int, 1);
			END LOOP;
			ttype := CASE WHEN random() < 0.7 THEN 'student' ELSE 'teacher' END;
			lbl := CASE WHEN ttype = 'student'
				THEN classes[1 + floor(random() * 18)::int]
				ELSE 'Guru' END;
			INSERT INTO tokens (code, type, label) VALUES (code, ttype, lbl)
			ON CONFLICT (code) DO NOTHING;
		END LOOP;
	END IF;

	-- ~15 suara dari token acak (token contoh ABCDE/GURU1/SISWA dibiarkan utuh untuk demo)
	IF (SELECT COUNT(*) FROM votes) < 15 THEN
		FOR r IN
			SELECT id, type FROM tokens
			WHERE is_used = false AND NOT (code = ANY (known))
			ORDER BY random()
			LIMIT 15
		LOOP
			SELECT id INTO cid FROM candidates ORDER BY random() LIMIT 1;
			pts := CASE WHEN r.type = 'teacher' THEN 2 ELSE 1 END;
			UPDATE tokens SET is_used = true, used_at = now() WHERE id = r.id;
			INSERT INTO votes (candidate_id, token_id, points)
			VALUES (cid, r.id, pts)
			ON CONFLICT (token_id) DO NOTHING;
		END LOOP;
	END IF;
END $$;
