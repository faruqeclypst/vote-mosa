<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import Pager from '$lib/components/admin/Pager.svelte';
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

	let listPage = $state(0);
	const PAGE_SIZE = 10;
	const totalPages = $derived(Math.max(1, Math.ceil(items.length / PAGE_SIZE)));
	const pagedItems = $derived(items.slice(listPage * PAGE_SIZE, (listPage + 1) * PAGE_SIZE));
	$effect(() => {
		if (listPage > totalPages - 1) listPage = totalPages - 1;
	});

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

<div class="mb-6">
	<span class="lbl !mb-1">PETUGAS</span>
	<h1 class="section-head">Kelola Admin</h1>
	<p class="hint !mb-0 mt-1">Hanya super admin yang bisa membuka halaman ini.</p>
</div>

{#if error}
	<p role="alert" class="alert-error mb-4">{error}</p>
{/if}

<section aria-label="Tambah admin" class="recap !p-6 mb-10">
	<h2 class="text-lg font-extrabold mb-4">Tambah admin</h2>
	<form onsubmit={add} class="grid gap-4 sm:grid-cols-2">
		<div>
			<label for="a-name" class="field-label">Nama</label>
			<input id="a-name" type="text" bind:value={name} required minlength="2" maxlength="80" class="input" />
		</div>
		<div>
			<label for="a-email" class="field-label">Email</label>
			<input id="a-email" type="email" bind:value={email} required class="input" />
		</div>
		<div>
			<label for="a-password" class="field-label">Password</label>
			<input id="a-password" type="password" bind:value={password} required minlength="8" autocomplete="new-password" class="input" />
		</div>
		<div>
			<label for="a-role" class="field-label">Role</label>
			<select id="a-role" bind:value={role} class="input">
				<option value="admin">Admin</option>
				<option value="super">Super admin</option>
			</select>
		</div>
		{#if formError}
			<p role="alert" class="alert-error sm:col-span-2">{formError}</p>
		{/if}
		<div class="sm:col-span-2">
			<button type="submit" disabled={saving} class="btn-flag !w-auto px-8">
				{saving ? 'Menyimpan...' : 'Tambah admin'}
			</button>
		</div>
	</form>
</section>

<span class="lbl">TERDAFTAR</span>
{#if loading}
	<p class="text-muted">Memuat admin...</p>
{:else if items.length === 0}
	<div class="recap text-muted">Belum ada admin.</div>
{:else}
	<div class="ledger-wrap">
		<table class="ledger">
			<thead>
				<tr>
					<th scope="col">NAMA</th>
					<th scope="col">EMAIL</th>
					<th scope="col">ROLE</th>
					<th scope="col"><span class="sr-only">Aksi</span></th>
				</tr>
			</thead>
			<tbody>
				{#each pagedItems as a (a.id)}
					<tr>
						<td class="font-extrabold">{a.name}</td>
						<td class="text-muted">{a.email}</td>
						<td>
							<span class="text-xs font-extrabold tracking-widest {a.role === 'super' ? 'text-flag' : 'text-muted'}">
								{a.role === 'super' ? 'SUPER' : 'ADMIN'}
							</span>
						</td>
						<td class="text-right whitespace-nowrap">
							{#if a.id !== myId}
								{#if confirmDelete === a.id}
									<button type="button" onclick={() => remove(a.id)} class="btn-flag btn-sm mr-2">
										Yakin, hapus
									</button>
									<button type="button" onclick={() => (confirmDelete = null)} class="btn-line btn-sm">
										Batal
									</button>
								{:else}
									<button type="button" onclick={() => (confirmDelete = a.id)} class="btn-danger btn-sm" aria-label="Hapus {a.name}">
										<Trash2 class="h-4 w-4" />
									</button>
								{/if}
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<Pager page={listPage} {totalPages} label="Paginasi admin" onPage={(p) => (listPage = p)} />
{/if}
