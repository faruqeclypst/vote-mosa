import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { hashPassword } from '$lib/auth';
import { isValidEmail, readJson, requireSuper } from '$lib/api';

export const GET: RequestHandler = async (event) => {
	const auth = requireSuper(event);
	if (auth instanceof Response) return auth;
	const sql = db();
	const rows = await sql`SELECT id, email, name, role, created_at FROM admins ORDER BY created_at ASC`;
	return json({ items: rows });
};

export const POST: RequestHandler = async (event) => {
	const auth = requireSuper(event);
	if (auth instanceof Response) return auth;
	const parsed = await readJson(event.request);
	if (!parsed.ok) return parsed.response;
	const { name, email, password, role } = parsed.body;

	if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
		return json({ error: 'Nama minimal 2 karakter.' }, { status: 400 });
	}
	if (!isValidEmail(email)) {
		return json({ error: 'Email tidak valid.' }, { status: 400 });
	}
	if (typeof password !== 'string' || password.length < 8) {
		return json({ error: 'Password minimal 8 karakter.' }, { status: 400 });
	}
	if (role !== 'admin' && role !== 'super') {
		return json({ error: 'Role tidak valid.' }, { status: 400 });
	}

	const sql = db();
	const dup = await sql`SELECT id FROM admins WHERE email = ${email.trim().toLowerCase()}`;
	if (dup.length > 0) return json({ error: 'Email sudah dipakai.' }, { status: 409 });

	const passwordHash = await hashPassword(password);
	const rows = await sql`
		INSERT INTO admins (email, name, password_hash, role)
		VALUES (${email.trim().toLowerCase()}, ${name.trim()}, ${passwordHash}, ${role})
		RETURNING id, email, name, role, created_at
	`;
	return json({ item: rows[0] }, { status: 201 });
};
