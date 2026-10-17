import type { PageServerLoad } from './$types';
import { db, ELECTIONS, type Candidate, type Election } from '$lib/db';

export const load: PageServerLoad = async () => {
	try {
		const sql = db();
		const settingsRows = await sql`SELECT key, value FROM settings WHERE key IN ('osis_open', 'mpk_open', 'election_title', 'school_name')`;
		const settings: Record<string, string> = {};
		for (const r of settingsRows as unknown as { key: string; value: string }[]) settings[r.key] = r.value;

		const elections = ELECTIONS.filter((e: Election) => settings[`${e}_open`] === 'true');
		let candidates: Candidate[] = [];
		if (elections.length > 0) {
			const rows = await sql`
				SELECT id, name, photo_url, vision, mission, election, sort_order
				FROM candidates
				WHERE election IN ${sql(elections)}
				ORDER BY election ASC, sort_order ASC, created_at ASC
			`;
			candidates = rows as unknown as Candidate[];
		}
		return {
			title: settings.election_title ?? 'Pemilihan Ketua OSIS',
			school: settings.school_name ?? 'SMAN Modal Bangsa',
			votingOpen: elections.length > 0,
			elections,
			candidates
		};
	} catch {
		return {
			title: 'Pemilihan Ketua OSIS',
			school: 'SMAN Modal Bangsa',
			votingOpen: false,
			elections: [] as Election[],
			candidates: [] as Candidate[]
		};
	}
};
