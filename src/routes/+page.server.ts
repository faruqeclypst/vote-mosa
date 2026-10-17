import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load: PageServerLoad = async () => {
	try {
		const sql = db();
		const rows = await sql`SELECT key, value FROM settings WHERE key IN ('voting_open', 'election_title', 'school_name')`;
		const settings: Record<string, string> = {};
		for (const r of rows as { key: string; value: string }[]) settings[r.key] = r.value;
		return {
			title: settings.election_title ?? 'Pemilihan Ketua OSIS',
			school: settings.school_name ?? 'SMAN Modal Bangsa',
			votingOpen: settings.voting_open === 'true'
		};
	} catch {
		return { title: 'Pemilihan Ketua OSIS', school: 'SMAN Modal Bangsa', votingOpen: false };
	}
};
