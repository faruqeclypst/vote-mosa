import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { adminCount } from '$lib/auth';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const path = url.pathname;
	const admin = locals.admin ?? null;

	if (admin) {
		if (path === '/admin/login' || path === '/admin/setup') throw redirect(303, '/admin');
		return { admin };
	}

	let empty = false;
	try {
		empty = (await adminCount()) === 0;
	} catch {
		empty = false;
	}

	if (path === '/admin/setup') {
		if (!empty) throw redirect(303, '/admin/login');
		return { admin: null };
	}

	if (empty) throw redirect(303, '/admin/setup');
	if (path !== '/admin/login') throw redirect(303, '/admin/login');
	return { admin: null };
};
