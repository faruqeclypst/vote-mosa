import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { requireAdmin } from '$lib/api';

export const GET: RequestHandler = async (event) => {
	const auth = requireAdmin(event);
	if (auth instanceof Response) return auth;

	const sql = db();
	const [voteAgg, tokenAgg, perCandidate] = await Promise.all([
		sql`SELECT COUNT(*)::int AS votes, COALESCE(SUM(points), 0)::int AS points FROM votes`,
		sql`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_used)::int AS used FROM tokens`,
		sql`
			SELECT c.id, c.name, c.photo_url, COUNT(v.id)::int AS votes, COALESCE(SUM(v.points), 0)::int AS points
			FROM candidates c
			LEFT JOIN votes v ON v.candidate_id = c.id
			GROUP BY c.id, c.name, c.photo_url, c.sort_order
			ORDER BY points DESC, votes DESC, c.sort_order ASC
		`
	]);

	const va = voteAgg[0] as { votes: number; points: number };
	const ta = tokenAgg[0] as { total: number; used: number };

	return json({
		totalVotes: va.votes,
		totalPoints: va.points,
		tokensUsed: ta.used,
		tokensTotal: ta.total,
		participationPct: ta.total > 0 ? Math.round((ta.used / ta.total) * 1000) / 10 : 0,
		perCandidate
	});
};
