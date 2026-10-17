import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

const CODE_RE = /^[A-Z0-9]{5}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const POST: RequestHandler = async ({ request }) => {
	let body: { code?: unknown; candidateId?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Format permintaan tidak valid.' }, { status: 400 });
	}

	const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
	const candidateId = typeof body.candidateId === 'string' ? body.candidateId.trim() : '';

	if (!CODE_RE.test(code)) {
		return json({ error: 'Kode token harus 5 karakter huruf atau angka.' }, { status: 400 });
	}
	if (!UUID_RE.test(candidateId)) {
		return json({ error: 'Kandidat tidak valid.' }, { status: 400 });
	}

	const sql = db();

	const settings = await sql`SELECT value FROM settings WHERE key = 'voting_open'`;
	if (settings.length === 0 || (settings[0] as { value: string }).value !== 'true') {
		return json({ error: 'Voting sedang ditutup oleh panitia.' }, { status: 403 });
	}

	try {
		await sql.begin(async (tx) => {
			const tokens = await tx`SELECT id, type, is_used FROM tokens WHERE code = ${code} FOR UPDATE`;
			if (tokens.length === 0) {
				throw { status: 404, message: 'Kode token tidak ditemukan.' };
			}
			const token = tokens[0] as { id: string; type: 'student' | 'teacher'; is_used: boolean };
			if (token.is_used) {
				throw { status: 409, message: 'Kode token ini sudah dipakai.' };
			}

			const candidates = await tx`SELECT id FROM candidates WHERE id = ${candidateId}`;
			if (candidates.length === 0) {
				throw { status: 400, message: 'Kandidat tidak ditemukan.' };
			}

			const points = token.type === 'teacher' ? 2 : 1;
			await tx`INSERT INTO votes (candidate_id, token_id, points) VALUES (${candidateId}, ${token.id}, ${points})`;
			await tx`UPDATE tokens SET is_used = true, used_at = now() WHERE id = ${token.id}`;
		});
	} catch (e: unknown) {
		if (e && typeof e === 'object' && 'status' in e) {
			const err = e as { status: number; message: string };
			return json({ error: err.message }, { status: err.status });
		}
		const msg = e instanceof Error ? e.message : '';
		if (msg.includes('duplicate key') || msg.includes('unique')) {
			return json({ error: 'Kode token ini sudah dipakai.' }, { status: 409 });
		}
		console.error('vote submit failed', e);
		return json({ error: 'Gagal menyimpan suara. Coba lagi.' }, { status: 500 });
	}

	return json({ ok: true });
};
