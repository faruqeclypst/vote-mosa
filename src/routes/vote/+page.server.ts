import type { PageServerLoad } from './$types';
import { db, type Candidate } from '$lib/db';

export const load: PageServerLoad = async () => {
	try {
		const sql = db();
		const settingsRows = await sql`SELECT key, value FROM settings WHERE key IN ('voting_open', 'election_title', 'school_name')`;
		const settings: Record<string, string> = {};
		for (const r of settingsRows as unknown as { key: string; value: string }[]) settings[r.key] = r.value;

		const votingOpen = settings.voting_open === 'true';
		let candidates: Candidate[] = [];
		if (votingOpen) {
			const rows = await sql`
				SELECT id, name, photo_url, vision, mission, sort_order
				FROM candidates
				ORDER BY sort_order ASC, created_at ASC
			`;
			candidates = rows as unknown as Candidate[];
		}
		return {
			title: settings.election_title ?? 'Pemilihan Ketua OSIS',
			school: settings.school_name ?? 'SMAN Modal Bangsa',
			votingOpen,
			candidates
		};
	} catch {
		return { title: 'Pemilihan Ketua OSIS', school: 'SMAN Modal Bangsa', votingOpen: false, candidates: [] as Candidate[] };
	}
};
