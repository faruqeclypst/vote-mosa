import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { readJson, requireAdmin } from '$lib/api';

const ALLOWED = ['osis_open', 'mpk_open', 'election_title', 'school_name'] as const;
const OPEN_LABEL: Record<string, string> = { osis_open: 'Pemilihan OSIS', mpk_open: 'Pemilihan MPK' };

export const GET: RequestHandler = async (event) => {
	const auth = requireAdmin(event);
	if (auth instanceof Response) return auth;
	const sql = db();
	const rows = await sql`SELECT key, value FROM settings`;
	const out: Record<string, string> = {};
	for (const r of rows as unknown as { key: string; value: string }[]) out[r.key] = r.value;
	return json({ settings: out });
};

export const PUT: RequestHandler = async (event) => {
	const auth = requireAdmin(event);
	if (auth instanceof Response) return auth;
	const parsed = await readJson(event.request);
	if (!parsed.ok) return parsed.response;

	const updates: { key: string; value: string }[] = [];
	for (const key of ALLOWED) {
		const v = parsed.body[key];
		if (v === undefined) continue;
		if (typeof v !== 'string') return json({ error: `Nilai ${key} tidak valid.` }, { status: 400 });
		if ((key === 'osis_open' || key === 'mpk_open') && v !== 'true' && v !== 'false') {
			return json({ error: `${OPEN_LABEL[key]} harus true atau false.` }, { status: 400 });
		}
		if ((key === 'election_title' || key === 'school_name') && (v.trim().length < 2 || v.length > 120)) {
			return json({ error: `Nilai ${key} minimal 2 karakter.` }, { status: 400 });
		}
		updates.push({ key, value: key === 'election_title' || key === 'school_name' ? v.trim() : v });
	}
	if (updates.length === 0) return json({ error: 'Tidak ada perubahan.' }, { status: 400 });

	const sql = db();
	for (const u of updates) {
		await sql`INSERT INTO settings (key, value) VALUES (${u.key}, ${u.value}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
	}
	return json({ ok: true });
};
