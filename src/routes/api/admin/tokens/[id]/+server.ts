import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { isUuid, requireAdmin } from '$lib/api';

export const DELETE: RequestHandler = async (event) => {
	const auth = requireAdmin(event);
	if (auth instanceof Response) return auth;
	const id = event.params.id ?? '';
	if (!isUuid(id)) return json({ error: 'ID tidak valid.' }, { status: 400 });

	const sql = db();
	const rows = await sql`DELETE FROM tokens WHERE id = ${id} AND is_used = false RETURNING id`;
	if (rows.length === 0) {
		return json({ error: 'Token tidak ditemukan atau sudah dipakai.' }, { status: 404 });
	}
	return json({ ok: true });
};
