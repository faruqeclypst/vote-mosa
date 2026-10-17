import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { db } from './db';

export const SESSION_COOKIE = 'sid';
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

export interface AdminSession {
	adminId: string;
	email: string;
	name: string;
	role: 'super' | 'admin';
}

export async function createSession(adminId: string): Promise<{ sid: string; expiresAt: Date }> {
	const sql = db();
	const sid = randomUUID();
	const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
	await sql`INSERT INTO sessions (id, admin_id, expires_at) VALUES (${sid}, ${adminId}, ${expiresAt.toISOString()})`;
	return { sid, expiresAt };
}

export async function getSession(sid: string | undefined): Promise<AdminSession | null> {
	if (!sid) return null;
	const sql = db();
	const rows = await sql`
		SELECT s.id, a.id AS admin_id, a.email, a.name, a.role
		FROM sessions s
		JOIN admins a ON a.id = s.admin_id
		WHERE s.id = ${sid} AND s.expires_at > now()
	`;
	if (rows.length === 0) return null;
	const r = rows[0] as { admin_id: string; email: string; name: string; role: 'super' | 'admin' };
	return { adminId: r.admin_id, email: r.email, name: r.name, role: r.role };
}

export async function destroySession(sid: string | undefined): Promise<void> {
	if (!sid) return;
	const sql = db();
	await sql`DELETE FROM sessions WHERE id = ${sid}`;
}

export async function adminCount(): Promise<number> {
	const sql = db();
	const rows = await sql`SELECT COUNT(*)::int AS n FROM admins`;
	return (rows[0] as { n: number }).n;
}

export function sessionCookieValue(sid: string, expiresAt: Date, isProd: boolean): string {
	const parts = [
		`${SESSION_COOKIE}=${sid}`,
		'Path=/',
		'HttpOnly',
		'SameSite=Lax',
		`Expires=${expiresAt.toUTCString()}`
	];
	if (isProd) parts.push('Secure');
	return parts.join('; ');
}

export function clearSessionCookie(isProd: boolean): string {
	const parts = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
	if (isProd) parts.push('Secure');
	return parts.join('; ');
}
