// Kompres foto kandidat di browser sebelum diunggah: sisi terpanjang 720px, JPEG 82%.
// Hasil akhir dikirim sebagai data URL dan disimpan sebagai blob di database.

const MAX_DIM = 720;
const QUALITY = 0.82;

function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(new Error('Gagal membaca berkas.'));
		reader.readAsDataURL(blob);
	});
}

export interface CompressedImage {
	dataUrl: string;
	bytes: number;
}

export async function compressImage(file: File): Promise<CompressedImage> {
	if (!file.type.startsWith('image/')) {
		throw new Error('Berkas harus berupa gambar.');
	}
	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
	} catch {
		bitmap = await createImageBitmap(file);
	}
	const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
	const w = Math.max(1, Math.round(bitmap.width * scale));
	const h = Math.max(1, Math.round(bitmap.height * scale));
	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Browser tidak mendukung pengolahan gambar.');
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, w, h);
	ctx.drawImage(bitmap, 0, 0, w, h);
	bitmap.close();

	const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
	if (!blob) throw new Error('Gagal mengompres gambar.');

	// Bila berkas asli sudah kecil dan hasil kompres justru lebih besar, pakai aslinya.
	if (file.size <= 250 * 1024 && file.size < blob.size && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
		return { dataUrl: await blobToDataUrl(file), bytes: file.size };
	}
	return { dataUrl: await blobToDataUrl(blob), bytes: blob.size };
}

export function formatBytes(n: number): string {
	if (n < 1024) return `${n} B`;
	return `${Math.round(n / 102.4) / 10} KB`;
}
