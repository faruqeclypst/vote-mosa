import type { Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, getSession } from '$lib/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const sid = event.cookies.get(SESSION_COOKIE);
	try {
		event.locals.admin = await getSession(sid);
	} catch {
		event.locals.admin = null;
	}
	return resolve(event);
};
