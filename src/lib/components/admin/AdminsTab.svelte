<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';

	interface AdminItem {
		id: string;
		email: string;
		name: string;
		role: 'super' | 'admin';
		created_at: string;
	}

	let items = $state<AdminItem[]>([]);
	let error = $state('');
	let loading = $state(true);
	let formError = $state('');
	let saving = $state(false);
	let confirmDelete = $state<string | null>(null);

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let role = $state<'admin' | 'super'>('admin');

	const myId = $derived((page.data as { admin?: { adminId: string } }).admin?.adminId);

	async function load() {
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/admin/admins');
			if (!res.ok) throw new Error();
			items = (await res.json()).items;
		} catch {
			error = 'Gagal memuat daftar admin.';
		} finally {
			loading = false;
		}
	}

	async function add(e: SubmitEvent) {
		e.preventDefault();
		if (saving) return;
		saving = true;
		formError = '';
		try {
			const res = await fetch('/api/admin/admins', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role })
			});
			const body = await res.json();
			if (!res.ok) {
				formError = body.error ?? 'Gagal menambah admin.';
				saving = false;
				return;
			}
			name = '';
			email = '';
			password = '';
			role = 'admin';
			await load();
		} catch {
			formError = 'Tidak bisa terhubung ke server.';
		} finally {
			saving = false;
		}
	}

	async function remove(id: string) {
		try {
			const res = await fetch(`/api/admin/admins/${id}`, { method: 'DELETE' });
			const body = await res.json();
			if (!res.ok) {
				error = body.error ?? 'Gagal menghapus admin.';
				return;
			}
			confirmDelete = null;
			await load();
		} catch {
			error = 'Tidak bisa terhubung ke server.';
		}
	}

	onMount(load);
</script>

<h1 class="font-display text-3xl tracking-tight mb-2">Kelola Admin</h1>
<p class="text-ink-soft mb-6">Hanya super admin yang bisa membuka halaman ini.</p>

{#if error}
	<p role="alert" class="text-brand-deep font-semibold mb-4">{error}</p>
{/if}

<section aria-label="Tambah admin" class="rounded-2xl border-2 border-ink bg-white p-6 mb-10">
	<h2 class="font-display text-xl mb-4">Tambah admin</h2>
	<form onsubmit={add} class="grid gap-4 sm:grid-cols-2">
		<div>
			<label for="a-name" class="block font-semibold mb-2">Nama</label>
			<input id="a-name" type="text" bind:value={name} required minlength="2" maxlength="80" class="w-full min-h-[52px] px-4 rounded-lg border-2 border-ink bg-white" />
		</div>
		<div>
			<label for="a-email" class="block font-semibold mb-2">Email</label>
			<input id="a-email" type="email" bind:value={email} required class="w-full min-h-[52px] px-4 rounded-lg border-2 border-ink bg-white" />
		</div>
		<div>
			<label for="a-password" class="block font-semibold mb-2">Password</label>
			<input id="a-password" type="password" bind:value={password} required minlength="8" autocomplete="new-password" class="w-full min-h-[52px] px-4 rounded-lg border-2 border-ink bg-white" />
		</div>
		<div>
			<label for="a-role" class="block font-semibold mb-2">Role</label>
			<select id="a-role" bind:value={role} class="w-full min-h-[52px] px-4 rounded-lg border-2 border-ink bg-white">
				<option value="admin">Admin</option>
				<option value="super">Super admin</option>
			</select>
		</div>
		{#if formError}
			<p role="alert" class="text-brand-deep font-semibold sm:col-span-2">{formError}</p>
		{/if}
		<div class="sm:col-span-2">
			<button type="submit" disabled={saving} class="min-h-[52px] px-8 rounded-lg bg-brand text-white font-semibold hover:bg-brand-deep disabled:opacity-50 transition-colors">
				{saving ? 'Menyimpan...' : 'Tambah admin'}
			</button>
		</div>
	</form>
</section>

<h2 class="font-display text-2xl tracking-tight mb-4">Daftar admin</h2>
{#if loading}
	<p class="text-ink-soft">Memuat admin...</p>
{:else if items.length === 0}
	<div class="rounded-xl border border-line bg-paper-deep p-6 text-ink-soft">Belum ada admin.</div>
{:else}
	<div class="space-y-3">
		{#each items as a (a.id)}
			<div class="rounded-xl border border-line bg-white p-4 flex items-center gap-4">
				<div class="flex-1 min-w-0">
					<p class="font-semibold truncate">{a.name}</p>
					<p class="text-sm text-ink-soft truncate">{a.email}</p>
				</div>
				<span class="text-xs font-semibold uppercase tracking-widest {a.role === 'super' ? 'text-brand' : 'text-ink-soft'} shrink-0">
					{a.role === 'super' ? 'Super' : 'Admin'}
				</span>
				{#if a.id !== myId}
					{#if confirmDelete === a.id}
						<button type="button" onclick={() => remove(a.id)} class="min-h-[44px] px-4 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-deep">
							Yakin, hapus
						</button>
						<button type="button" onclick={() => (confirmDelete = null)} class="min-h-[44px] px-4 rounded-lg border border-line bg-white text-sm hover:bg-paper-deep">
							Batal
						</button>
					{:else}
						<button type="button" onclick={() => (confirmDelete = a.id)} class="min-h-[44px] px-4 rounded-lg border border-line bg-white text-sm text-brand-deep hover:bg-paper-deep">
							Hapus
						</button>
					{/if}
				{/if}
			</div>
		{/each}
	</div>
{/if}
