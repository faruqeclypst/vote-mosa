import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { adminCount, createSession, hashPassword, sessionCookieValue } from '$lib/auth';
import { isValidEmail, readJson } from '$lib/api';

export const POST: RequestHandler = async (event) => {
	const { request } = event;
	if ((await adminCount()) > 0) {
		return json({ error: 'Akun admin sudah ada. Halaman ini tidak tersedia.' }, { status: 403 });
	}

	const parsed = await readJson(request);
	if (!parsed.ok) return parsed.response;
	const { name, email, password } = parsed.body;

	if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
		return json({ error: 'Nama minimal 2 karakter.' }, { status: 400 });
	}
	if (!isValidEmail(email)) {
		return json({ error: 'Email tidak valid.' }, { status: 400 });
	}
	if (typeof password !== 'string' || password.length < 8) {
		return json({ error: 'Password minimal 8 karakter.' }, { status: 400 });
	}

	const sql = db();
	const existing = await sql`SELECT id FROM admins LIMIT 1`;
	if (existing.length > 0) {
		return json({ error: 'Akun admin sudah ada. Halaman ini tidak tersedia.' }, { status: 403 });
	}

	const passwordHash = await hashPassword(password);
	const rows = await sql`
		INSERT INTO admins (email, name, password_hash, role)
		VALUES (${email.trim().toLowerCase()}, ${name.trim()}, ${passwordHash}, 'super')
		RETURNING id
	`;
	const adminId = (rows[0] as { id: string }).id;
	const { sid, expiresAt } = await createSession(adminId);

	return json(
		{ ok: true },
		{ headers: { 'Set-Cookie': sessionCookieValue(sid, expiresAt, event.url.protocol === 'https:') } }
	);
};
