import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { readJson, requireAdmin } from '$lib/api';

function validateCandidate(body: Record<string, unknown>): { ok: true; data: { name: string; photo_url: string | null; vision: string | null; mission: string | null; sort_order: number } } | { ok: false; error: string } {
	const { name, photo_url, vision, mission, sort_order } = body;
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
	return { ok: true, data: { name: name.trim(), photo_url: photo, vision: visionText, mission: missionText, sort_order: order } };
}

export const GET: RequestHandler = async (event) => {
	const auth = requireAdmin(event);
	if (auth instanceof Response) return auth;
	const sql = db();
	const rows = await sql`SELECT id, name, photo_url, vision, mission, sort_order FROM candidates ORDER BY sort_order ASC, created_at ASC`;
	return json({ items: rows });
};

export const POST: RequestHandler = async (event) => {
	const auth = requireAdmin(event);
	if (auth instanceof Response) return auth;
	const parsed = await readJson(event.request);
	if (!parsed.ok) return parsed.response;
	const validated = validateCandidate(parsed.body);
	if (!validated.ok) return json({ error: validated.error }, { status: 400 });
	const d = validated.data;
	const sql = db();
	const rows = await sql`
		INSERT INTO candidates (name, photo_url, vision, mission, sort_order)
		VALUES (${d.name}, ${d.photo_url}, ${d.vision}, ${d.mission}, ${d.sort_order})
		RETURNING id, name, photo_url, vision, mission, sort_order
	`;
	return json({ item: rows[0] }, { status: 201 });
};
