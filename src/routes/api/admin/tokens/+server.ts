import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { requireAdmin } from '$lib/api';

export const GET: RequestHandler = async (event) => {
	const auth = requireAdmin(event);
	if (auth instanceof Response) return auth;

	const type = event.url.searchParams.get('type');
	const used = event.url.searchParams.get('used');
	const q = (event.url.searchParams.get('q') ?? '').trim().toUpperCase().slice(0, 20);
	const limit = Math.min(Math.max(parseInt(event.url.searchParams.get('limit') ?? '50', 10) || 50, 1), 200);
	const offset = Math.max(parseInt(event.url.searchParams.get('offset') ?? '0', 10) || 0, 0);

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
	if (q) {
		conditions.push(`(code LIKE $${i} OR UPPER(label) LIKE $${i})`);
		params.push(`%${q}%`);
		i++;
	}
	const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

	const countRows = (await sql.unsafe(`SELECT COUNT(*)::int AS n FROM tokens ${where}`, params)) as { n: number }[];
	const items = (await sql.unsafe(
		`SELECT id, code, type, label, is_used, used_at, created_at FROM tokens ${where} ORDER BY created_at DESC LIMIT $${i} OFFSET $${i + 1}`,
		[...params, limit, offset]
	)) as unknown[];

	return json({ items, total: countRows[0].n, limit, offset });
};
