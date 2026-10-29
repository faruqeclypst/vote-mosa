import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { requireAdmin } from '$lib/api';

function slugify(v: string): string {
	return v
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 40);
}

// Netralkan sel yang bisa dibaca Excel sebagai rumus.
function csvCell(v: string | null): string {
	let s = v ?? '';
	if (/^[=+\-@\t]/.test(s)) s = `'${s}`;
	return `"${s.replace(/"/g, '""')}"`;
}

export const GET: RequestHandler = async (event) => {
	const auth = requireAdmin(event);
	if (auth instanceof Response) return auth;

	const type = event.url.searchParams.get('type');
	const used = event.url.searchParams.get('used');
	const label = (event.url.searchParams.get('label') ?? '').trim().slice(0, 80);

	const sql = db();
	const conditions: string[] = [];
	const params: (string | number | boolean)[] = [];
	let i = 1;
	if (type === 'student' || type === 'teacher') {
		conditions.push(`type = $${i++}`);
		params.push(type);
	}
	if (used === 'true' || used === 'false') {
		conditions.push(`is_used = $${i++}`);
		params.push(used === 'true');
	}
	if (label) {
		conditions.push(`UPPER(COALESCE(label, '')) = UPPER($${i++})`);
		params.push(label);
	}
	const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

	const rows = (await sql.unsafe(
		`SELECT code, type, label, is_used FROM tokens ${where} ORDER BY label ASC NULLS LAST, created_at ASC, code ASC`,
		params
	)) as { code: string; type: string; label: string | null; is_used: boolean }[];

	const lines = ['kode,tipe,label,sudah_dipakai'];
	for (const r of rows) {
		lines.push(
			[csvCell(r.code), csvCell(r.type === 'teacher' ? 'guru' : 'siswa'), csvCell(r.label), r.is_used ? 'ya' : 'tidak'].join(',')
		);
	}

	let filename = 'token-pemilihan';
	if (type === 'teacher') filename = 'token-guru';
	else if (type === 'student') filename = 'token-siswa';
	if (label) filename = `token-${type === 'teacher' ? 'guru' : 'kelas'}-${slugify(label) || 'tanpa-label'}`;

	return new Response('\uFEFF' + lines.join('\r\n'), {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}.csv"`
		}
	});
};
