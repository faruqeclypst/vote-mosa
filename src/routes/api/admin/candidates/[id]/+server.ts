import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { isUuid, readJson, requireAdmin } from '$lib/api';
import { parsePhotoChange } from '$lib/photos';
import { validateCandidate } from '$lib/candidates';

export const PUT: RequestHandler = async (event) => {
	const auth = requireAdmin(event);
	if (auth instanceof Response) return auth;
	const id = event.params.id ?? '';
	if (!isUuid(id)) return json({ error: 'ID tidak valid.' }, { status: 400 });
	const parsed = await readJson(event.request);
	if (!parsed.ok) return parsed.response;
	const validated = validateCandidate(parsed.body);
	if (!validated.ok) return json({ error: validated.error }, { status: 400 });
	const photo = parsePhotoChange(parsed.body);
	if (photo.kind === 'error') return json({ error: photo.error }, { status: 400 });
	const d = validated.data;
	const sql = db();

	let rows: { id: string }[];
	if (photo.kind === 'set') {
		rows = (await sql`
			UPDATE candidates
			SET name = ${d.name}, photo_url = ${d.photo_url}, photo_data = ${photo.data}, photo_mime = ${photo.mime},
				election = ${d.election}, sort_order = ${d.sort_order}, updated_at = now()
			WHERE id = ${id}
			RETURNING id
		`) as unknown as { id: string }[];
	} else if (photo.kind === 'clear') {
		rows = (await sql`
			UPDATE candidates
			SET name = ${d.name}, photo_url = ${d.photo_url}, photo_data = NULL, photo_mime = NULL,
				election = ${d.election}, sort_order = ${d.sort_order}, updated_at = now()
			WHERE id = ${id}
			RETURNING id
		`) as unknown as { id: string }[];
	} else {
		rows = (await sql`
			UPDATE candidates
			SET name = ${d.name}, photo_url = ${d.photo_url},
				election = ${d.election}, sort_order = ${d.sort_order}, updated_at = now()
			WHERE id = ${id}
			RETURNING id
		`) as unknown as { id: string }[];
	}
	if (rows.length === 0) return json({ error: 'Kandidat tidak ditemukan.' }, { status: 404 });
	return json({ ok: true });
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
