import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { AdminSession } from '$lib/auth';

export function requireAdmin(event: RequestEvent): AdminSession | Response {
	if (!event.locals.admin) {
		return json({ error: 'Harus login dulu.' }, { status: 401 });
	}
	return event.locals.admin;
}

export function requireSuper(event: RequestEvent): AdminSession | Response {
	const admin = requireAdmin(event);
	if (admin instanceof Response) return admin;
	if (admin.role !== 'super') {
		return json({ error: 'Hanya super admin yang boleh.' }, { status: 403 });
	}
	return admin;
}

export async function readJson(request: Request): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; response: Response }> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return { ok: false, response: json({ error: 'Format permintaan tidak valid.' }, { status: 400 }) };
	}
	if (body === null || typeof body !== 'object' || Array.isArray(body)) {
		return { ok: false, response: json({ error: 'Format permintaan tidak valid.' }, { status: 400 }) };
	}
	return { ok: true, body: body as Record<string, unknown> };
}

export function isUuid(v: unknown): v is string {
	return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export function isValidEmail(v: unknown): v is string {
	return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) && v.trim().length <= 160;
}
