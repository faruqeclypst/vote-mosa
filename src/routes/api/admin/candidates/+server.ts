import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { readJson, requireAdmin } from '$lib/api';
import { candidatePhotoSrc, parsePhotoChange } from '$lib/photos';
import { validateCandidate } from '$lib/candidates';

interface CandidateRow {
	id: string;
	name: string;
	photo_url: string | null;
	election: 'osis' | 'mpk';
	sort_order: number;
	has_blob: boolean;
	updated_at: string;
}

function toItem(r: CandidateRow) {
	return {
		id: r.id,
		name: r.name,
		photo_url: candidatePhotoSrc(r),
		photo_link: r.has_blob ? null : r.photo_url,
		has_blob: r.has_blob,
		election: r.election,
		sort_order: r.sort_order
	};
}

const SELECT = `id, name, photo_url, election, sort_order, (photo_data IS NOT NULL) AS has_blob, updated_at`;

export const GET: RequestHandler = async (event) => {
	const auth = requireAdmin(event);
	if (auth instanceof Response) return auth;
	const sql = db();
	const rows = (await sql.unsafe(
		`SELECT ${SELECT} FROM candidates ORDER BY election ASC, sort_order ASC, created_at ASC`
	)) as unknown as CandidateRow[];
	return json({ items: rows.map(toItem) });
};

export const POST: RequestHandler = async (event) => {
	const auth = requireAdmin(event);
	if (auth instanceof Response) return auth;
	const parsed = await readJson(event.request);
	if (!parsed.ok) return parsed.response;
	const validated = validateCandidate(parsed.body);
	if (!validated.ok) return json({ error: validated.error }, { status: 400 });
	const photo = parsePhotoChange(parsed.body);
	if (photo.kind === 'error') return json({ error: photo.error }, { status: 400 });
	const d = validated.data;
	const sql = db();
	const photoData = photo.kind === 'set' ? photo.data : null;
	const photoMime = photo.kind === 'set' ? photo.mime : null;
	const rows = (await sql`
		INSERT INTO candidates (name, photo_url, photo_data, photo_mime, election, sort_order)
		VALUES (${d.name}, ${d.photo_url}, ${photoData}, ${photoMime}, ${d.election}, ${d.sort_order})
		RETURNING id
	`) as unknown as { id: string }[];
	const created = (await sql.unsafe(`SELECT ${SELECT} FROM candidates WHERE id = $1`, [rows[0].id])) as unknown as CandidateRow[];
	return json({ item: toItem(created[0]) }, { status: 201 });
};
