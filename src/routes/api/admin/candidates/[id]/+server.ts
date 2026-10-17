import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { isUuid, readJson, requireAdmin } from '$lib/api';

function validateCandidate(body: Record<string, unknown>) {
	const { name, photo_url, vision, mission, sort_order } = body;
	if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 120) {
		return { ok: false as const, error: 'Nama kandidat minimal 2 karakter.' };
	}
	const photo = typeof photo_url === 'string' && photo_url.trim() !== '' ? photo_url.trim() : null;
	if (photo && (photo.length > 2000 || !/^https?:\/\//i.test(photo))) {
		return { ok: false as const, error: 'URL foto tidak valid (harus http/https).' };
	}
	const visionText = typeof vision === 'string' && vision.trim() !== '' ? vision.trim() : null;
	const missionText = typeof mission === 'string' && mission.trim() !== '' ? mission.trim() : null;
	const order = typeof sort_order === 'number' && Number.isInteger(sort_order) ? sort_order : 0;
	if (visionText && visionText.length > 2000) return { ok: false as const, error: 'Visi terlalu panjang.' };
	if (missionText && missionText.length > 5000) return { ok: false as const, error: 'Misi terlalu panjang.' };
	return { ok: true as const, data: { name: name.trim(), photo_url: photo, vision: visionText, mission: missionText, sort_order: order } };
}

export const PUT: RequestHandler = async (event) => {
	const auth = requireAdmin(event);
	if (auth instanceof Response) return auth;
	const id = event.params.id ?? '';
	if (!isUuid(id)) return json({ error: 'ID tidak valid.' }, { status: 400 });
	const parsed = await readJson(event.request);
	if (!parsed.ok) return parsed.response;
	const validated = validateCandidate(parsed.body);
	if (!validated.ok) return json({ error: validated.error }, { status: 400 });
	const d = validated.data;
	const sql = db();
	const rows = await sql`
		UPDATE candidates
		SET name = ${d.name}, photo_url = ${d.photo_url}, vision = ${d.vision}, mission = ${d.mission},
			sort_order = ${d.sort_order}, updated_at = now()
		WHERE id = ${id}
		RETURNING id, name, photo_url, vision, mission, sort_order
	`;
	if (rows.length === 0) return json({ error: 'Kandidat tidak ditemukan.' }, { status: 404 });
	return json({ item: rows[0] });
};

export const DELETE: RequestHandler = async (event) => {
	const auth = requireAdmin(event);
	if (auth instanceof Response) return auth;
	const id = event.params.id ?? '';
	if (!isUuid(id)) return json({ error: 'ID tidak valid.' }, { status: 400 });
	const sql = db();
	const rows = await sql`DELETE FROM candidates WHERE id = ${id} RETURNING id`;
	if (rows.length === 0) return json({ error: 'Kandidat tidak ditemukan.' }, { status: 404 });
	return json({ ok: true });
};
