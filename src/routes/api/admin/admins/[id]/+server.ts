import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { isUuid, requireSuper } from '$lib/api';

export const DELETE: RequestHandler = async (event) => {
	const auth = requireSuper(event);
	if (auth instanceof Response) return auth;
	const id = event.params.id ?? '';
	if (!isUuid(id)) return json({ error: 'ID tidak valid.' }, { status: 400 });

	const sql = db();
	const rows = await sql`SELECT id, role FROM admins WHERE id = ${id}`;
	if (rows.length === 0) return json({ error: 'Admin tidak ditemukan.' }, { status: 404 });
	const target = rows[0] as { id: string; role: string };

	if (target.id === auth.adminId) {
		return json({ error: 'Tidak bisa menghapus akun sendiri.' }, { status: 400 });
	}
	if (target.role === 'super') {
		const supers = await sql`SELECT COUNT(*)::int AS n FROM admins WHERE role = 'super'`;
		if ((supers[0] as { n: number }).n <= 1) {
			return json({ error: 'Tidak bisa menghapus satu-satunya super admin.' }, { status: 400 });
		}
	}

	await sql`DELETE FROM sessions WHERE admin_id = ${id}`;
	await sql`DELETE FROM admins WHERE id = ${id}`;
	return json({ ok: true });
};
