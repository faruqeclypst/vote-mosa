import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SESSION_COOKIE, clearSessionCookie, destroySession } from '$lib/auth';

export const POST: RequestHandler = async (event) => {
	await destroySession(event.cookies.get(SESSION_COOKIE));
	event.cookies.delete(SESSION_COOKIE, { path: '/' });
	return json(
		{ ok: true },
		{ headers: { 'Set-Cookie': clearSessionCookie(event.url.protocol === 'https:') } }
	);
};

export const GET: RequestHandler = async (event) => {
	await destroySession(event.cookies.get(SESSION_COOKIE));
	event.cookies.delete(SESSION_COOKIE, { path: '/' });
	throw redirect(303, '/admin/login');
};
