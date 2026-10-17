import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { createSession, sessionCookieValue, verifyPassword } from '$lib/auth';
import { readJson } from '$lib/api';

export const POST: RequestHandler = async (event) => {
	const parsed = await readJson(event.request);
	if (!parsed.ok) return parsed.response;
	const { email, password } = parsed.body;

	if (typeof email !== 'string' || typeof password !== 'string') {
		return json({ error: 'Email dan password wajib diisi.' }, { status: 400 });
	}

	const sql = db();
	const rows = await sql`SELECT id, password_hash FROM admins WHERE email = ${email.trim().toLowerCase()}`;
	if (rows.length === 0) {
		return json({ error: 'Email atau password salah.' }, { status: 401 });
	}
	const admin = rows[0] as { id: string; password_hash: string };
	const valid = await verifyPassword(password, admin.password_hash);
	if (!valid) {
		return json({ error: 'Email atau password salah.' }, { status: 401 });
	}

	const { sid, expiresAt } = await createSession(admin.id);
	return json(
		{ ok: true },
		{ headers: { 'Set-Cookie': sessionCookieValue(sid, expiresAt, event.url.protocol === 'https:') } }
	);
};
