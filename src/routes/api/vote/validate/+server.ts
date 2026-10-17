import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, ELECTIONS, type Election } from '$lib/db';

const CODE_RE = /^[A-Z0-9]{5}$/;

export const POST: RequestHandler = async ({ request }) => {
	let body: { code?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Format permintaan tidak valid.' }, { status: 400 });
	}

	const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
	if (!CODE_RE.test(code)) {
		return json({ error: 'Kode token harus 5 karakter huruf atau angka.' }, { status: 400 });
	}

	const sql = db();

	const settingsRows = await sql`SELECT key, value FROM settings WHERE key IN ('osis_open', 'mpk_open')`;
	const settings: Record<string, string> = {};
	for (const r of settingsRows as unknown as { key: string; value: string }[]) settings[r.key] = r.value;
	const open = ELECTIONS.filter((e) => settings[`${e}_open`] === 'true');
	if (open.length === 0) {
		return json({ error: 'Pemilihan sedang ditutup oleh panitia.' }, { status: 403 });
	}

	const rows = await sql`SELECT id, type FROM tokens WHERE code = ${code}`;
	if (rows.length === 0) {
		return json({ error: 'Kode token tidak ditemukan. Periksa kembali kodemu.' }, { status: 404 });
	}
	const token = rows[0] as { id: string; type: 'student' | 'teacher' };

	// Token berlaku per pemilihan: hanya pemilihan yang belum dipilih token ini yang ditawarkan
	const votedRows = await sql`SELECT election FROM votes WHERE token_id = ${token.id}`;
	const voted = new Set((votedRows as unknown as { election: string }[]).map((v) => v.election));
	const available = open.filter((e: Election) => !voted.has(e));
	if (available.length === 0) {
		return json({ error: 'Kode token ini sudah dipakai.' }, { status: 409 });
	}

	return json({ ok: true, type: token.type, elections: available });
};
