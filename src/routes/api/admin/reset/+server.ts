import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { readJson, requireSuper } from '$lib/api';

// Reset data pemilihan (hanya super admin). Wajib menyertakan confirm: 'RESET'.
// scope 'votes_tokens': hapus semua suara + semua token (kandidat dipertahankan).
// scope 'all': votes_tokens + semua kandidat ikut dihapus.
export const POST: RequestHandler = async (event) => {
	const auth = requireSuper(event);
	if (auth instanceof Response) return auth;

	const parsed = await readJson(event.request);
	if (!parsed.ok) return parsed.response;

	if (parsed.body.confirm !== 'RESET') {
		return json({ error: 'Konfirmasi tidak cocok. Ketik RESET untuk melanjutkan.' }, { status: 400 });
	}
	const scope = parsed.body.scope;
	if (scope !== 'votes_tokens' && scope !== 'all') {
		return json({ error: 'Ruang lingkup reset tidak valid.' }, { status: 400 });
	}

	const sql = db();
	const deleted = await sql.begin(async (tx) => {
		const [v] = await tx`SELECT COUNT(*)::int AS n FROM votes`;
		const [t] = await tx`SELECT COUNT(*)::int AS n FROM tokens`;
		let candidates = 0;
		if (scope === 'all') {
			const [c] = await tx`SELECT COUNT(*)::int AS n FROM candidates`;
			candidates = (c as { n: number }).n;
		}
		await tx`DELETE FROM votes`;
		await tx`DELETE FROM tokens`;
		if (scope === 'all') await tx`DELETE FROM candidates`;
		return {
			votes: (v as { n: number }).n,
			tokens: (t as { n: number }).n,
			candidates
		};
	});

	return json({ ok: true, scope, deleted });
};
