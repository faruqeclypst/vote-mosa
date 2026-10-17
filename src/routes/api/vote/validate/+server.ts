import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

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

	const settings = await sql`SELECT value FROM settings WHERE key = 'voting_open'`;
	if (settings.length === 0 || (settings[0] as { value: string }).value !== 'true') {
		return json({ error: 'Voting sedang ditutup oleh panitia.' }, { status: 403 });
	}

	const rows = await sql`SELECT id, type, is_used FROM tokens WHERE code = ${code}`;
	if (rows.length === 0) {
		return json({ error: 'Kode token tidak ditemukan. Periksa kembali kodemu.' }, { status: 404 });
	}
	const token = rows[0] as { id: string; type: 'student' | 'teacher'; is_used: boolean };
	if (token.is_used) {
		return json({ error: 'Kode token ini sudah dipakai.' }, { status: 409 });
	}

	return json({ ok: true, type: token.type });
};
