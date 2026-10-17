import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, ELECTIONS, ELECTION_LABEL } from '$lib/db';

const CODE_RE = /^[A-Z0-9]{5}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const POST: RequestHandler = async ({ request }) => {
	let body: { code?: unknown; picks?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Format permintaan tidak valid.' }, { status: 400 });
	}

	const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
	if (!CODE_RE.test(code)) {
		return json({ error: 'Kode token harus 5 karakter huruf atau angka.' }, { status: 400 });
	}

	const rawPicks = body.picks;
	if (!rawPicks || typeof rawPicks !== 'object' || Array.isArray(rawPicks)) {
		return json({ error: 'Pilih minimal satu kandidat.' }, { status: 400 });
	}
	const picks: { election: string; candidateId: string }[] = [];
	for (const e of ELECTIONS) {
		const cid = (rawPicks as Record<string, unknown>)[e];
		if (cid === undefined || cid === null || cid === '') continue;
		if (typeof cid !== 'string' || !UUID_RE.test(cid.trim())) {
			return json({ error: `Kandidat ${ELECTION_LABEL[e]} tidak valid.` }, { status: 400 });
		}
		picks.push({ election: e, candidateId: cid.trim() });
	}
	if (picks.length === 0) {
		return json({ error: 'Pilih minimal satu kandidat.' }, { status: 400 });
	}

	const sql = db();

	try {
		await sql.begin(async (tx) => {
			const settingsRows = await tx`SELECT key, value FROM settings WHERE key IN ('osis_open', 'mpk_open')`;
			const settings: Record<string, string> = {};
			for (const r of settingsRows as unknown as { key: string; value: string }[]) settings[r.key] = r.value;

			const tokens = await tx`SELECT id, type FROM tokens WHERE code = ${code} FOR UPDATE`;
			if (tokens.length === 0) {
				throw { status: 404, message: 'Kode token tidak ditemukan.' };
			}
			const token = tokens[0] as { id: string; type: 'student' | 'teacher' };
			const points = token.type === 'teacher' ? 2 : 1;

			for (const p of picks) {
				if (settings[`${p.election}_open`] !== 'true') {
					throw { status: 403, message: `Pemilihan ${ELECTION_LABEL[p.election as keyof typeof ELECTION_LABEL]} sudah ditutup.` };
				}
				const cands = await tx`SELECT id FROM candidates WHERE id = ${p.candidateId} AND election = ${p.election}`;
				if (cands.length === 0) {
					throw { status: 400, message: `Kandidat ${ELECTION_LABEL[p.election as keyof typeof ELECTION_LABEL]} tidak ditemukan.` };
				}
				const existing = await tx`SELECT 1 FROM votes WHERE token_id = ${token.id} AND election = ${p.election}`;
				if (existing.length > 0) {
					throw { status: 409, message: `Token ini sudah dipakai untuk memilih ${ELECTION_LABEL[p.election as keyof typeof ELECTION_LABEL]}.` };
				}
				await tx`INSERT INTO votes (candidate_id, token_id, election, points) VALUES (${p.candidateId}, ${token.id}, ${p.election}, ${points})`;
			}

			// Tandai token pernah dipakai (dipakai di >=1 pemilihan); used_at = suara pertama
			await tx`UPDATE tokens SET is_used = true, used_at = COALESCE(used_at, now()) WHERE id = ${token.id}`;
		});
	} catch (e: unknown) {
		if (e && typeof e === 'object' && 'status' in e) {
			const err = e as { status: number; message: string };
			return json({ error: err.message }, { status: err.status });
		}
		const msg = e instanceof Error ? e.message : '';
		if (msg.includes('duplicate key') || msg.includes('unique')) {
			return json({ error: 'Token ini sudah dipakai untuk pemilihan tersebut.' }, { status: 409 });
		}
		console.error('vote submit failed', e);
		return json({ error: 'Gagal menyimpan suara. Coba lagi.' }, { status: 500 });
	}

	return json({ ok: true });
};
