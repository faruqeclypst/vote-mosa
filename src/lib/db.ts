import postgres, { type Sql } from 'postgres';

let cached: Sql | null = null;

export function db(): Sql {
	const url = process.env.DATABASE_URL;
	if (!url) {
		throw new Error('DATABASE_URL belum di-set. Lihat .env.example');
	}
	if (!cached) {
		cached = postgres(url, {
			max: 10,
			idle_timeout: 20,
			connect_timeout: 10
		});
	}
	return cached;
}

export interface Candidate {
	id: string;
	name: string;
	photo_url: string | null;
	vision: string | null;
	mission: string | null;
	sort_order: number;
}

export interface TokenRow {
	id: string;
	code: string;
	type: 'student' | 'teacher';
	label: string | null;
	is_used: boolean;
	used_at: string | null;
	created_at: string;
}
