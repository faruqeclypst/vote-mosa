import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { readJson, requireAdmin } from '$lib/api';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(): string {
	let s = '';
	for (let i = 0; i < 5; i++) {
		s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
	}
	return s;
}

export const POST: RequestHandler = async (event) => {
	const auth = requireAdmin(event);
	if (auth instanceof Response) return auth;

	const parsed = await readJson(event.request);
	if (!parsed.ok) return parsed.response;
	const { count, type, label } = parsed.body;

	const n = typeof count === 'number' ? Math.floor(count) : 0;
	if (!Number.isInteger(n) || n < 1 || n > 1000) {
		return json({ error: 'Jumlah harus antara 1 dan 1000.' }, { status: 400 });
	}
	if (type !== 'student' && type !== 'teacher') {
		return json({ error: 'Tipe harus siswa atau guru.' }, { status: 400 });
	}
	const labelText = typeof label === 'string' && label.trim() !== '' ? label.trim().slice(0, 80) : null;

	const sql = db();
	const inserted: string[] = [];
	let attempts = 0;
	while (inserted.length < n && attempts < n * 10 + 50) {
		attempts++;
		const batch = new Set<string>();
		while (batch.size < Math.min(n - inserted.length, 100)) batch.add(randomCode());
		const codes = [...batch];
		const rows = await sql`
			INSERT INTO tokens (code, type, label)
			SELECT * FROM UNNEST(${codes}::varchar(8)[], ARRAY_FILL(${type}::text, ARRAY[${codes.length}]), ARRAY_FILL(${labelText}::text, ARRAY[${codes.length}]))
			AS t(code, type, label)
			ON CONFLICT (code) DO NOTHING
			RETURNING code
		`;
		for (const r of rows as { code: string }[]) inserted.push(r.code);
	}

	return json({ ok: true, generated: inserted.length, codes: inserted });
};
