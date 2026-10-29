import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { requireAdmin } from '$lib/api';

// Ringkasan token per kelompok: siswa dikelompokkan per label kelas, guru per labelnya.
// Dipakai panel export per kelas / per guru di tab Token.
export const GET: RequestHandler = async (event) => {
	const auth = requireAdmin(event);
	if (auth instanceof Response) return auth;

	const sql = db();
	const rows = (await sql`
		SELECT
			type,
			COALESCE(NULLIF(TRIM(label), ''), '') AS label,
			COUNT(*)::int AS total,
			COUNT(*) FILTER (WHERE is_used)::int AS used,
			COUNT(*) FILTER (WHERE NOT is_used)::int AS unused
		FROM tokens
		GROUP BY type, COALESCE(NULLIF(TRIM(label), ''), '')
		ORDER BY type ASC, label ASC
	`) as unknown as {
		type: 'student' | 'teacher';
		label: string;
		total: number;
		used: number;
		unused: number;
	}[];

	return json({ groups: rows });
};
