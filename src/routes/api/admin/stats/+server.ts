import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { requireAdmin } from '$lib/api';

export const GET: RequestHandler = async (event) => {
	const auth = requireAdmin(event);
	if (auth instanceof Response) return auth;

	const election = event.url.searchParams.get('election') === 'mpk' ? 'mpk' : 'osis';

	const sql = db();
	const [voteAgg, usedAgg, tokenAgg, perCandidate] = await Promise.all([
		sql`SELECT COUNT(*)::int AS votes, COALESCE(SUM(points), 0)::int AS points FROM votes WHERE election = ${election}`,
		sql`SELECT COUNT(DISTINCT token_id)::int AS used FROM votes WHERE election = ${election}`,
		sql`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_used)::int AS used FROM tokens`,
		sql`
			SELECT c.id, c.name, c.photo_url, COUNT(v.id)::int AS votes, COALESCE(SUM(v.points), 0)::int AS points
			FROM candidates c
			LEFT JOIN votes v ON v.candidate_id = c.id
			WHERE c.election = ${election}
			GROUP BY c.id, c.name, c.photo_url, c.sort_order
			ORDER BY points DESC, votes DESC, c.sort_order ASC
		`
	]);

	const va = voteAgg[0] as { votes: number; points: number };
	const ua = usedAgg[0] as { used: number };
	const ta = tokenAgg[0] as { total: number; used: number };

	return json({
		election,
		totalVotes: va.votes,
		totalPoints: va.points,
		tokensUsed: ua.used,
		tokensTotal: ta.total,
		participationPct: ta.total > 0 ? Math.round((ua.used / ta.total) * 1000) / 10 : 0,
		perCandidate
	});
};
