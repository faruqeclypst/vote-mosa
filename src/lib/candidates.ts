export interface CandidateInput {
	name: string;
	photo_url: string | null;
	vision: string | null;
	mission: string | null;
	election: 'osis' | 'mpk';
	sort_order: number;
}

export function validateCandidate(
	body: Record<string, unknown>
): { ok: true; data: CandidateInput } | { ok: false; error: string } {
	const { name, photo_url, vision, mission, election, sort_order } = body;
	if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 120) {
		return { ok: false, error: 'Nama kandidat minimal 2 karakter.' };
	}
	const photo = typeof photo_url === 'string' && photo_url.trim() !== '' ? photo_url.trim() : null;
	if (photo && (photo.length > 2000 || !/^https?:\/\//i.test(photo))) {
		return { ok: false, error: 'URL foto tidak valid (harus http/https).' };
	}
	const visionText = typeof vision === 'string' && vision.trim() !== '' ? vision.trim() : null;
	const missionText = typeof mission === 'string' && mission.trim() !== '' ? mission.trim() : null;
	const order = typeof sort_order === 'number' && Number.isInteger(sort_order) ? sort_order : 0;
	if (visionText && visionText.length > 2000) return { ok: false, error: 'Visi terlalu panjang.' };
	if (missionText && missionText.length > 5000) return { ok: false, error: 'Misi terlalu panjang.' };
	const electionVal = election === 'mpk' ? 'mpk' : 'osis';
	return {
		ok: true,
		data: { name: name.trim(), photo_url: photo, vision: visionText, mission: missionText, election: electionVal, sort_order: order }
	};
}
