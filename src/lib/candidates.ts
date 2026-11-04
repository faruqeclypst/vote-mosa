export interface CandidateInput {
	name: string;
	photo_url: string | null;
	election: 'osis' | 'mpk';
	sort_order: number;
}

export function validateCandidate(
	body: Record<string, unknown>
): { ok: true; data: CandidateInput } | { ok: false; error: string } {
	const { name, photo_url, election, sort_order } = body;
	if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 120) {
		return { ok: false, error: 'Nama kandidat minimal 2 karakter.' };
	}
	const photo = typeof photo_url === 'string' && photo_url.trim() !== '' ? photo_url.trim() : null;
	if (photo && (photo.length > 2000 || !/^https?:\/\//i.test(photo))) {
		return { ok: false, error: 'URL foto tidak valid (harus http/https).' };
	}
	const order = typeof sort_order === 'number' && Number.isInteger(sort_order) ? sort_order : 0;
	const electionVal = election === 'mpk' ? 'mpk' : 'osis';
	return {
		ok: true,
		data: { name: name.trim(), photo_url: photo, election: electionVal, sort_order: order }
	};
}
