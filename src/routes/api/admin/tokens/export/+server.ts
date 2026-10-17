import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { requireAdmin } from '$lib/api';

export const GET: RequestHandler = async (event) => {
	const auth = requireAdmin(event);
	if (auth instanceof Response) return auth;

	const type = event.url.searchParams.get('type');
	const used = event.url.searchParams.get('used');

	const sql = db();
	const conditions: string[] = [];
	const params: unknown[] = [];
	let i = 1;
	if (type === 'student' || type === 'teacher') {
		conditions.push(`type = $${i++}`);
		params.push(type);
	}
	if (used === 'true' || used === 'false') {
		conditions.push(`is_used = $${i++}`);
		params.push(used === 'true');
	}
	const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

	const rows = (await sql.unsafe(
		`SELECT code, type, label, is_used FROM tokens ${where} ORDER BY created_at ASC`,
		params
	)) as { code: string; type: string; label: string | null; is_used: boolean }[];

	const esc = (v: string | null) => `"${(v ?? '').replace(/"/g, '""')}"`;
	const lines = ['kode,tipe,label,sudah_dipakai'];
	for (const r of rows) {
		lines.push([esc(r.code), esc(r.type === 'teacher' ? 'guru' : 'siswa'), esc(r.label), r.is_used ? 'ya' : 'tidak'].join(','));
	}

	return new Response('\uFEFF' + lines.join('\r\n'), {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': 'attachment; filename="token-pemilihan-osis.csv"'
		}
	});
};
