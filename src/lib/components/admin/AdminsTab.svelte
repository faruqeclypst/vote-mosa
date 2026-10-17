<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { Trash2 } from '@lucide/svelte';

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

<h1 class="page-title mb-2">Kelola Admin</h1>
<p class="text-slate-500 mb-6">Hanya super admin yang bisa membuka halaman ini.</p>

{#if error}
	<p role="alert" class="alert-error mb-4">{error}</p>
{/if}

<section aria-label="Tambah admin" class="card-pad mb-10">
	<h2 class="text-xl font-bold text-slate-900 mb-4">Tambah admin</h2>
	<form onsubmit={add} class="grid gap-4 sm:grid-cols-2">
		<div>
			<label for="a-name" class="field-label">Nama</label>
			<input id="a-name" type="text" bind:value={name} required minlength="2" maxlength="80" class="input-field" />
		</div>
		<div>
			<label for="a-email" class="field-label">Email</label>
			<input id="a-email" type="email" bind:value={email} required class="input-field" />
		</div>
		<div>
			<label for="a-password" class="field-label">Password</label>
			<input id="a-password" type="password" bind:value={password} required minlength="8" autocomplete="new-password" class="input-field" />
		</div>
		<div>
			<label for="a-role" class="field-label">Role</label>
			<select id="a-role" bind:value={role} class="input-field">
				<option value="admin">Admin</option>
				<option value="super">Super admin</option>
			</select>
		</div>
		{#if formError}
			<p role="alert" class="alert-error sm:col-span-2">{formError}</p>
		{/if}
		<div class="sm:col-span-2">
			<button type="submit" disabled={saving} class="btn-primary">
				{saving ? 'Menyimpan...' : 'Tambah admin'}
			</button>
		</div>
	</form>
</section>

<h2 class="section-title mb-4">Daftar admin</h2>
{#if loading}
	<p class="text-slate-500">Memuat admin...</p>
{:else if items.length === 0}
	<div class="card-pad text-slate-500">Belum ada admin.</div>
{:else}
	<div class="card divide-y divide-slate-100">
		{#each items as a (a.id)}
			<div class="p-4 flex items-center gap-4">
				<div class="flex-1 min-w-0">
					<p class="font-semibold text-slate-900 truncate">{a.name}</p>
					<p class="text-sm text-slate-500 truncate">{a.email}</p>
				</div>
				<span class={a.role === 'super' ? 'badge-blue' : 'badge-slate'}>
					{a.role === 'super' ? 'Super' : 'Admin'}
				</span>
				{#if a.id !== myId}
					{#if confirmDelete === a.id}
						<div class="flex gap-2">
							<button type="button" onclick={() => remove(a.id)} class="btn-danger btn-sm">
								Yakin, hapus
							</button>
							<button type="button" onclick={() => (confirmDelete = null)} class="btn-secondary btn-sm">
								Batal
							</button>
						</div>
					{:else}
						<button type="button" onclick={() => (confirmDelete = a.id)} class="btn-danger-outline" aria-label="Hapus {a.name}">
							<Trash2 class="h-4 w-4" />
						</button>
					{/if}
				{/if}
			</div>
		{/each}
	</div>
{/if}
