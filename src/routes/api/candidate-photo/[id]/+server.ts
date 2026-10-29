import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { isUuid } from '$lib/api';

// Publik: foto kandidat memang ditampilkan ke semua pemilih di surat suara.
export const GET: RequestHandler = async (event) => {
	const id = event.params.id ?? '';
	if (!isUuid(id)) return new Response('Tidak ditemukan', { status: 404 });

	const sql = db();
	const rows = await sql`SELECT photo_data, photo_mime, updated_at FROM candidates WHERE id = ${id}`;
	if (rows.length === 0) return new Response('Tidak ditemukan', { status: 404 });
	const row = rows[0] as { photo_data: Uint8Array | null; photo_mime: string | null; updated_at: string };
	if (!row.photo_data) return new Response('Tidak ditemukan', { status: 404 });

	const etag = `"${new Date(row.updated_at).getTime()}"`;
	if (event.request.headers.get('if-none-match') === etag) {
		return new Response(null, { status: 304, headers: { ETag: etag } });
	}

	return new Response(new Uint8Array(row.photo_data), {
		headers: {
			'Content-Type': row.photo_mime ?? 'image/jpeg',
			'Cache-Control': 'public, max-age=86400',
			ETag: etag
		}
	});
};
