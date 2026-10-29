import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { requireAdmin } from '$lib/api';

export const GET: RequestHandler = async (event) => {
	const auth = requireAdmin(event);
	if (auth instanceof Response) return auth;

	const election = event.url.searchParams.get('election') === 'mpk' ? 'mpk' : 'osis';

	const sql = db();
	const [perCandidate, byType, recent] = await Promise.all([
		sql`
			SELECT c.id, c.name, c.photo_url, COUNT(v.id)::int AS votes, COALESCE(SUM(v.points), 0)::int AS points
			FROM candidates c
			LEFT JOIN votes v ON v.candidate_id = c.id AND v.election = c.election
			WHERE c.election = ${election}
			GROUP BY c.id, c.name, c.photo_url, c.sort_order
			ORDER BY points DESC, votes DESC, c.sort_order ASC
		`,
		sql`
			SELECT t.type, COUNT(v.id)::int AS votes, COALESCE(SUM(v.points), 0)::int AS points
			FROM votes v
			JOIN tokens t ON t.id = v.token_id
			WHERE v.election = ${election}
			GROUP BY t.type
		`,
		sql`
			SELECT v.created_at, v.points, t.type AS voter_type, c.name AS candidate_name
			FROM votes v
			JOIN tokens t ON t.id = v.token_id
			JOIN candidates c ON c.id = v.candidate_id
			WHERE v.election = ${election}
			ORDER BY v.created_at DESC
			LIMIT 50
		`
	]);

	const rows = perCandidate as unknown as { points: number }[];
	const totalPoints = rows.reduce((s, r) => s + r.points, 0);

	return json({
		election,
		perCandidate: rows.map((r) => ({ ...r, sharePct: totalPoints > 0 ? Math.round((r.points / totalPoints) * 1000) / 10 : 0 })),
		byType,
		recentVotes: recent,
		totalPoints
	});
};
