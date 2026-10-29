// Foto kandidat: unggahan disimpan sebagai blob (bytea) di tabel candidates dan
// disajikan lewat /api/candidate-photo/<id>. URL eksternal tetap didukung sebagai cadangan.

export const MAX_PHOTO_BYTES = 512 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type PhotoChange =
	| { kind: 'keep' }
	| { kind: 'clear' }
	| { kind: 'set'; data: Buffer; mime: string }
	| { kind: 'error'; error: string };

// Membaca field photo_data dari body JSON admin.
// undefined = jangan diubah, null = hapus foto blob, string data URL = ganti foto.
export function parsePhotoChange(body: Record<string, unknown>): PhotoChange {
	if (!('photo_data' in body) || body.photo_data === undefined) return { kind: 'keep' };
	const v = body.photo_data;
	if (v === null || v === '') return { kind: 'clear' };
	if (typeof v !== 'string') return { kind: 'error', error: 'Format foto tidak valid.' };
	const m = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(v.trim());
	if (!m) return { kind: 'error', error: 'Format foto tidak valid (harus data URL base64).' };
	const mime = m[1].toLowerCase();
	if (!ALLOWED_MIME.has(mime)) return { kind: 'error', error: 'Format foto harus JPG, PNG, atau WebP.' };
	const data = Buffer.from(m[2], 'base64');
	if (data.length === 0) return { kind: 'error', error: 'Berkas foto kosong.' };
	if (data.length > MAX_PHOTO_BYTES) {
		return { kind: 'error', error: 'Ukuran foto setelah kompres melebihi 512 KB. Pakai foto yang lebih kecil.' };
	}
	return { kind: 'set', data, mime };
}

// Sumber foto untuk ditampilkan: blob didahulukan, lalu URL eksternal.
export function candidatePhotoSrc(row: {
	id: string;
	photo_url: string | null;
	has_blob?: boolean;
	updated_at?: string | Date;
}): string | null {
	if (row.has_blob) {
		const v = row.updated_at ? new Date(row.updated_at).getTime() : 0;
		return `/api/candidate-photo/${row.id}?v=${v}`;
	}
	return row.photo_url;
}
